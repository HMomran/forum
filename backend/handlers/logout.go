package handlers

import (
	"encoding/json"
	"net/http"

	"real-time-forum/db"
)

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func jsonOK(w http.ResponseWriter, code int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(payload)
}

func userIDFromSession(r *http.Request) string {
	// 1. Per-tab header (sent by authFetch on the frontend)
	if t := r.Header.Get("X-Session-Token"); t != "" {
		if id := db.GetUserIDByToken(t); id != "" {
			return id
		}
	}
	// 2. WS query param
	if t := r.URL.Query().Get("token"); t != "" {
		if id := db.GetUserIDByToken(t); id != "" {
			return id
		}
	}
	// 3. Fallback: cookie (single-browser usage)
	cookie, err := r.Cookie("session_token")
	if err != nil {
		return ""
	}
	return db.GetUserIDByToken(cookie.Value)
}

func Logout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Try header token first (per-tab sessions), then cookie
	token := r.Header.Get("X-Session-Token")
	if token == "" {
		if cookie, err := r.Cookie("session_token"); err == nil {
			token = cookie.Value
		}
	}
	if token != "" {
		db.DeleteSessionByToken(token)
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
	})

	jsonOK(w, http.StatusOK, map[string]string{"message": "logged out"})
}
