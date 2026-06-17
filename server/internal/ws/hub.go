package ws

import (
	"encoding/json"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/gobwas/ws"
	"github.com/gobwas/ws/wsutil"
)

// Message is a typed envelope for WebSocket events.
type Message struct {
	Type    string          `json:"type"`
	Room    string          `json:"room,omitempty"`
	Payload json.RawMessage `json:"payload"`
}

// Hub manages room-based WebSocket connections.
type Hub struct {
	rooms      map[string]map[*Conn]bool
	register   chan *Conn
	unregister chan *Conn
	broadcast  chan *broadcastMsg
	mu         sync.RWMutex
}

type broadcastMsg struct {
	room string
	data []byte
}

// Conn is a single WebSocket connection.
type Conn struct {
	hub    *Hub
	conn   net.Conn
	send   chan []byte
	rooms  map[string]bool
	userID string
	mu     sync.Mutex
}

func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[string]map[*Conn]bool),
		register:   make(chan *Conn),
		unregister: make(chan *Conn),
		broadcast:  make(chan *broadcastMsg, 256),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			for room := range c.rooms {
				if h.rooms[room] == nil {
					h.rooms[room] = make(map[*Conn]bool)
				}
				h.rooms[room][c] = true
			}
			h.mu.Unlock()
			log.Printf("client registered rooms=%v user=%s", c.rooms, c.userID)

		case c := <-h.unregister:
			h.mu.Lock()
			for room := range c.rooms {
				if clients, ok := h.rooms[room]; ok {
					delete(clients, c)
					if len(clients) == 0 {
						delete(h.rooms, room)
					}
				}
			}
			h.mu.Unlock()
			close(c.send)
			if c.conn != nil {
				c.conn.Close()
			}
			log.Printf("client unregistered user=%s", c.userID)

		case msg := <-h.broadcast:
			h.mu.RLock()
			clients := h.rooms[msg.room]
			h.mu.RUnlock()
			var dead []*Conn
			for c := range clients {
				select {
				case c.send <- msg.data:
				default:
					// Slow client, drop.
					close(c.send)
					if c.conn != nil {
						c.conn.Close()
					}
					dead = append(dead, c)
				}
			}
			if len(dead) > 0 {
				h.mu.Lock()
				roomClients := h.rooms[msg.room]
				for _, c := range dead {
					delete(roomClients, c)
				}
				if len(roomClients) == 0 {
					delete(h.rooms, msg.room)
				}
				h.mu.Unlock()
			}
		}
	}
}

// BroadcastToRoom sends a message to all connections in a room.
func (h *Hub) BroadcastToRoom(room string, v any) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	h.broadcast <- &broadcastMsg{room: room, data: b}
	return nil
}

// ServeHTTP upgrades HTTP to WebSocket using gobwas/ws.
// Expects ?token=<jwt> and optional ?rooms=room1,room2 query params.
func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	var userID string
	if token != "" {
		claims, err := jwt.Verify(r.Context(), &jwt.VerifyParams{Token: token})
		if err != nil {
			http.Error(w, `{"error":"invalid_token"}`, http.StatusUnauthorized)
			return
		}
		userID = claims.Subject
	}
	roomList := r.URL.Query().Get("rooms")
	rooms := make(map[string]bool)
	if roomList != "" {
		for _, room := range strings.Split(roomList, ",") {
			if room = strings.TrimSpace(room); room != "" {
				rooms[room] = true
			}
		}
	}
	// Default room: global
	if len(rooms) == 0 {
		rooms["global"] = true
	}

	conn, _, _, err := ws.UpgradeHTTP(r, w)
	if err != nil {
		log.Printf("ws upgrade failed: %v", err)
		return
	}

	// Auto-join user-specific room for targeted broadcasts
	if userID != "" && userID != "anonymous" {
		rooms["user:"+userID] = true
	}

	client := &Conn{hub: h, conn: conn, send: make(chan []byte, 256), rooms: rooms, userID: userID}
	h.register <- client
	go client.writePump()
	go client.readPump()
}

func (c *Conn) readPump() {
	defer func() {
		c.hub.unregister <- c
	}()

	for {
		msg, op, err := wsutil.ReadClientData(c.conn)
		if err != nil {
			return
		}
		if op != ws.OpText {
			continue
		}
		var envelope Message
		if err := json.Unmarshal(msg, &envelope); err != nil {
			continue
		}
		// If client sends a room join request
		if envelope.Type == "room:join" && envelope.Room != "" {
			c.mu.Lock()
			c.rooms[envelope.Room] = true
			c.mu.Unlock()
			c.hub.mu.Lock()
			if c.hub.rooms[envelope.Room] == nil {
				c.hub.rooms[envelope.Room] = make(map[*Conn]bool)
			}
			c.hub.rooms[envelope.Room][c] = true
			c.hub.mu.Unlock()
			continue
		}
		// Relay message to the room it targets
		room := envelope.Room
		if room == "" {
			room = "global"
		}
		c.hub.broadcast <- &broadcastMsg{room: room, data: msg}
	}
}

func (c *Conn) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			if !ok {
				c.conn.Close()
				return
			}
			if err := wsutil.WriteServerText(c.conn, msg); err != nil {
				return
			}
		case <-ticker.C:
			if err := wsutil.WriteServerText(c.conn, []byte(`{"type":"ping"}`)); err != nil {
				return
			}
		}
	}
}
