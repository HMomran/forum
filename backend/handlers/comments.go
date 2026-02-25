package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"real-time-forum/db"

	"github.com/google/uuid"
)

func Comments(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		listComments(w, r)
	case http.MethodPost:
		createComment(w, r)
	default:
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func DeleteComment(w http.ResponseWriter, r *http.Request) {
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
		CommentID string `json:"comment_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.CommentID == "" {
		jsonError(w, "comment_id is required", http.StatusBadRequest)
		return
	}

	ownerID, err := db.GetCommentOwnerID(req.CommentID)
	if err != nil || ownerID == "" {
		jsonError(w, "comment not found", http.StatusNotFound)
		return
	}
	if ownerID != userID {
		jsonError(w, "forbidden", http.StatusForbidden)
		return
	}

	db.DeleteComment(req.CommentID)
	jsonOK(w, http.StatusOK, map[string]string{"message": "comment deleted"})
}

func listComments(w http.ResponseWriter, r *http.Request) {
	postID := strings.TrimSpace(r.URL.Query().Get("post_id"))
	if postID == "" {
		jsonError(w, "post_id is required", http.StatusBadRequest)
		return
	}

	comments, err := db.ListComments(postID)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	jsonOK(w, http.StatusOK, comments)
}

func createComment(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromSession(r)
	if userID == "" {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		PostID  string `json:"post_id"`
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	req.PostID = strings.TrimSpace(req.PostID)
	req.Content = strings.TrimSpace(req.Content)

	if req.PostID == "" || req.Content == "" {
		jsonError(w, "post_id and content are required", http.StatusBadRequest)
		return
	}

	if !db.PostExists(req.PostID) {
		jsonError(w, "post not found", http.StatusNotFound)
		return
	}

	id := uuid.NewString()
	if err := db.CreateComment(id, req.PostID, userID, req.Content); err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	comment, err := db.GetCommentByID(id)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	jsonOK(w, http.StatusCreated, comment)
}
