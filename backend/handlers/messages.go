package handlers

import (
	"net/http"
	"strconv"

	"real-time-forum/db"
)

func Messages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	myID := userIDFromSession(r)
	if myID == "" {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	withID := r.URL.Query().Get("with")
	if withID == "" {
		jsonError(w, "with parameter is required", http.StatusBadRequest)
		return
	}

	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if offset < 0 {
		offset = 0
	}

	msgs, err := db.GetMessages(myID, withID, 10, offset)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	jsonOK(w, http.StatusOK, msgs)
}

func Users(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	myID := userIDFromSession(r)
	if myID == "" {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	users, err := db.GetAllUsersExcept(myID)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	jsonOK(w, http.StatusOK, users)
}
