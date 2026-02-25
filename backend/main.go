package main

import (
	"log"
	"net/http"

	"real-time-forum/db"
	"real-time-forum/handlers"
)

func main() {
	db.Init("./forum.db")

	mux := http.NewServeMux()

	mux.HandleFunc("/api/register", handlers.Register)
	mux.HandleFunc("/api/login", handlers.Login)
	mux.HandleFunc("/api/logout", handlers.Logout)

	mux.HandleFunc("/api/posts", handlers.Posts)
	mux.HandleFunc("/api/posts/delete", handlers.DeletePost)

	mux.HandleFunc("/api/comments", handlers.Comments)
	mux.HandleFunc("/api/comments/delete", handlers.DeleteComment)

	mux.HandleFunc("/api/votes", handlers.Vote)

	mux.HandleFunc("/api/messages", handlers.Messages)
	mux.HandleFunc("/api/users", handlers.Users)

	mux.HandleFunc("/ws", handlers.ServeWS)

	mux.Handle("/", http.FileServer(http.Dir("../frontend")))

	log.Println("server running → http://localhost:5500")
	log.Fatal(http.ListenAndServe(":5500", cors(mux)))
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5500")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
