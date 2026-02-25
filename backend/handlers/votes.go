package handlers

import (
	"encoding/json"
	"net/http"

	"real-time-forum/db"

	"github.com/google/uuid"
)

func Vote(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := userIDFromSession(r)
	if userID == "" {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		PostID string `json:"post_id"`
		Value  int    `json:"value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.PostID == "" || (req.Value != 1 && req.Value != -1) {
		jsonError(w, "post_id and value (1 or -1) are required", http.StatusBadRequest)
		return
	}

	existingID, existingValue := db.GetVote(req.PostID, userID)
	switch {
	case existingID == "":
		db.CreateVote(uuid.NewString(), req.PostID, userID, req.Value)
	case existingValue == req.Value:
		db.DeleteVote(existingID)
	default:
		db.UpdateVote(existingID, req.Value)
	}

	upvotes, downvotes, userVote := db.GetVoteSummary(req.PostID, userID)
	jsonOK(w, http.StatusOK, map[string]int{
		"upvotes":   upvotes,
		"downvotes": downvotes,
		"user_vote": userVote,
	})
}
