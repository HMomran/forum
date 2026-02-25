package db

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func Init(path string) {
	var err error
	DB, err = sql.Open("sqlite3", path)
	if err != nil {
		log.Fatal("failed to open database:", err)
	}
	if err = DB.Ping(); err != nil {
		log.Fatal("failed to connect to database:", err)
	}
	createTables()
	log.Println("database ready")
}

func createTables() {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id         TEXT PRIMARY KEY,
			nickname   TEXT NOT NULL UNIQUE,
			firstname  TEXT NOT NULL,
			lastname   TEXT NOT NULL,
			email      TEXT NOT NULL UNIQUE,
			age        INTEGER NOT NULL,
			gender     TEXT NOT NULL,
			password   TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS sessions (
			token      TEXT PRIMARY KEY,
			user_id    TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS posts (
			id         TEXT PRIMARY KEY,
			user_id    TEXT NOT NULL,
			title      TEXT NOT NULL,
			content    TEXT NOT NULL,
			category   TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS comments (
			id         TEXT PRIMARY KEY,
			post_id    TEXT NOT NULL,
			user_id    TEXT NOT NULL,
			content    TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (post_id) REFERENCES posts(id),
			FOREIGN KEY (user_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS messages (
			id          TEXT PRIMARY KEY,
			sender_id   TEXT NOT NULL,
			receiver_id TEXT NOT NULL,
			content     TEXT NOT NULL,
			created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (sender_id)   REFERENCES users(id),
			FOREIGN KEY (receiver_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS votes (
			id      TEXT PRIMARY KEY,
			post_id TEXT NOT NULL,
			user_id TEXT NOT NULL,
			value   INTEGER NOT NULL,
			UNIQUE(post_id, user_id),
			FOREIGN KEY (post_id) REFERENCES posts(id),
			FOREIGN KEY (user_id) REFERENCES users(id)
		)`,
	}

	for _, q := range queries {
		if _, err := DB.Exec(q); err != nil {
			log.Fatal("failed to create table:", err)
		}
	}
}
