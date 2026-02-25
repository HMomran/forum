package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"real-time-forum/db"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type loginRequest struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}

func Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	req.Identifier = strings.TrimSpace(req.Identifier)
	if req.Identifier == "" || req.Password == "" {
		jsonError(w, "identifier and password are required", http.StatusBadRequest)
		return
	}

	user, err := db.GetUserByIdentifier(req.Identifier)
	if err != nil {
		jsonError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		jsonError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	// Invalidate any existing sessions so only one active session exists at a time
	db.DeleteSessionsByUserID(user.ID)

	token := uuid.NewString()
	if err := db.CreateSession(token, user.ID); err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Now().Add(24 * time.Hour),
	})

	user.Password = ""
	jsonOK(w, http.StatusOK, map[string]any{
		"message": "login successful",
		"user":    user,
	})
}
