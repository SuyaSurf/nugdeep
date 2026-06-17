package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL required")
	}

	ctx := context.Background()
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer conn.Close(ctx)

	if _, err := conn.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ DEFAULT now()
		)
	`); err != nil {
		log.Fatalf("create migrations table: %v", err)
	}

	migrationsDir := "/migrations"
	if len(os.Args) > 1 {
		migrationsDir = os.Args[1]
	}

	files, err := os.ReadDir(migrationsDir)
	if err != nil {
		log.Fatalf("read migrations dir: %v", err)
	}

	var ups []string
	for _, f := range files {
		if strings.HasSuffix(f.Name(), ".up.sql") {
			ups = append(ups, f.Name())
		}
	}
	sort.Strings(ups)

	for _, name := range ups {
		version := strings.Split(name, "_")[0]
		var exists bool
		if err := conn.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)`, version).Scan(&exists); err != nil {
			log.Fatalf("check migration: %v", err)
		}
		if exists {
			log.Printf("skip %s", name)
			continue
		}

		content, err := os.ReadFile(filepath.Join(migrationsDir, name))
		if err != nil {
			log.Fatalf("read %s: %v", name, err)
		}

		if _, err := conn.Exec(ctx, string(content)); err != nil {
			log.Fatalf("exec %s: %v", name, err)
		}
		if _, err := conn.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, version); err != nil {
			log.Fatalf("record %s: %v", name, err)
		}
		log.Printf("applied %s", name)
	}
	fmt.Println("migrations complete")
}
