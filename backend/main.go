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

	mux.HandleFunc("/api/upload", handlers.Upload)

	mux.HandleFunc("/ws", handlers.ServeWS)

	// Serve uploaded files
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))

	mux.Handle("/", http.FileServer(http.Dir("..")))

	log.Println("server running → http://localhost:5500")
	log.Fatal(http.ListenAndServe(":5500", cors(mux)))
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Session-Token")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}