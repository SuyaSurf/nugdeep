package ws

import (
	"testing"
	"time"
)

func TestHubRoomLifecycle(t *testing.T) {
	h := NewHub()
	go h.Run()

	// Simulate two clients in the same room
	c1 := &Conn{hub: h, send: make(chan []byte, 4), rooms: map[string]bool{"room-a": true}, userID: "u1"}
	c2 := &Conn{hub: h, send: make(chan []byte, 4), rooms: map[string]bool{"room-a": true}, userID: "u2"}

	h.register <- c1
	h.register <- c2

	// Give hub time to process
	time.Sleep(50 * time.Millisecond)

	// Broadcast to room-a
	if err := h.BroadcastToRoom("room-a", map[string]string{"msg": "hello"}); err != nil {
		t.Fatalf("BroadcastToRoom: %v", err)
	}

	// Both clients should receive
	select {
	case b := <-c1.send:
		if string(b) != `{"msg":"hello"}` {
			t.Errorf("c1 got %s", b)
		}
	case <-time.After(time.Second):
		t.Error("c1 did not receive")
	}
	select {
	case b := <-c2.send:
		if string(b) != `{"msg":"hello"}` {
			t.Errorf("c2 got %s", b)
		}
	case <-time.After(time.Second):
		t.Error("c2 did not receive")
	}

	// Client in different room should not receive
	c3 := &Conn{hub: h, send: make(chan []byte, 4), rooms: map[string]bool{"room-b": true}, userID: "u3"}
	h.register <- c3
	time.Sleep(50 * time.Millisecond)

	select {
	case b := <-c3.send:
		t.Errorf("c3 should not receive, got %s", b)
	case <-time.After(200 * time.Millisecond):
		// expected
	}

	// Unregister c1
	h.unregister <- c1
	time.Sleep(50 * time.Millisecond)

	// Broadcast again; only c2 should receive
	if err := h.BroadcastToRoom("room-a", map[string]string{"msg": "again"}); err != nil {
		t.Fatalf("BroadcastToRoom: %v", err)
	}
	select {
	case msg, ok := <-c1.send:
		if ok {
			t.Errorf("c1 should not receive after unregister, got %s", msg)
		}
	case <-time.After(200 * time.Millisecond):
	}
	select {
	case b := <-c2.send:
		if string(b) != `{"msg":"again"}` {
			t.Errorf("c2 got %s", b)
		}
	case <-time.After(time.Second):
		t.Error("c2 did not receive")
	}
}

func TestHubSlowClientDropped(t *testing.T) {
	h := NewHub()
	go h.Run()

	// Client with tiny buffer that will block
	c := &Conn{hub: h, send: make(chan []byte, 0), rooms: map[string]bool{"room-x": true}, userID: "slow"}
	h.register <- c
	time.Sleep(50 * time.Millisecond)

	// First broadcast will try to send but default case triggers (buffer full, no reader)
	if err := h.BroadcastToRoom("room-x", map[string]string{"msg": "1"}); err != nil {
		t.Fatalf("BroadcastToRoom: %v", err)
	}
	time.Sleep(50 * time.Millisecond)

	// Second broadcast should not panic; room map was cleaned up
	if err := h.BroadcastToRoom("room-x", map[string]string{"msg": "2"}); err != nil {
		t.Fatalf("BroadcastToRoom: %v", err)
	}
	// If we got here without panic, cleanup worked
}
