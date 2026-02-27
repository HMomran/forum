package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"real-time-forum/db"

	"github.com/google/uuid"
)

func Posts(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		listPosts(w, r)
	case http.MethodPost:
		createPost(w, r)
	default:
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func DeletePost(w http.ResponseWriter, r *http.Request) {
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
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PostID == "" {
		jsonError(w, "post_id is required", http.StatusBadRequest)
		return
	}

	ownerID, err := db.GetPostOwnerID(req.PostID)
	if err != nil || ownerID == "" {
		jsonError(w, "post not found", http.StatusNotFound)
		return
	}
	if ownerID != userID {
		jsonError(w, "forbidden", http.StatusForbidden)
		return
	}

	db.DeletePostCascade(req.PostID)
	jsonOK(w, http.StatusOK, map[string]string{"message": "post deleted"})
}

func listPosts(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromSession(r)
	filter := strings.TrimSpace(r.URL.Query().Get("filter"))
	categories := strings.TrimSpace(r.URL.Query().Get("categories"))
	sort := strings.TrimSpace(r.URL.Query().Get("sort"))

	orderBy := "p.created_at DESC"
	switch sort {
	case "oldest":
		orderBy = "p.created_at ASC"
	case "top":
		orderBy = "(upvotes - downvotes) DESC"
	}

	switch filter {
	case "mine":
		posts, err := db.ListMinePosts(userID, orderBy)
		if err != nil {
			jsonError(w, "internal server error", http.StatusInternalServerError)
			return
		}
		jsonOK(w, http.StatusOK, posts)
	case "liked":
		posts, err := db.ListLikedPosts(userID, orderBy)
		if err != nil {
			jsonError(w, "internal server error", http.StatusInternalServerError)
			return
		}
		jsonOK(w, http.StatusOK, posts)
	default:
		if categories != "" {
			posts, err := db.ListPostsByCategories(userID, strings.Split(categories, ","), orderBy)
			if err != nil {
				jsonError(w, "internal server error", http.StatusInternalServerError)
				return
			}
			jsonOK(w, http.StatusOK, posts)
		} else {
			posts, err := db.ListAllPosts(userID, orderBy)
			if err != nil {
				jsonError(w, "internal server error", http.StatusInternalServerError)
				return
			}
			jsonOK(w, http.StatusOK, posts)
		}
	}
}

func createPost(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromSession(r)
	if userID == "" {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		Title      string   `json:"title"`
		Content    string   `json:"content"`
		Categories []string `json:"categories"`
		ImageURL   string   `json:"image_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	req.Content = strings.TrimSpace(req.Content)
	req.ImageURL = strings.TrimSpace(req.ImageURL)

	cleaned := []string{}
	for _, c := range req.Categories {
		c = strings.TrimSpace(c)
		if c != "" {
			cleaned = append(cleaned, c)
		}
	}

	if req.Title == "" || len(cleaned) == 0 {
		jsonError(w, "title and at least one category are required", http.StatusBadRequest)
		return
	}
	
	if req.Content == "" && req.ImageURL == "" {
		jsonError(w, "post must have content or an image", http.StatusBadRequest)
		return
	}

	category := strings.Join(cleaned, ",")
	id := uuid.NewString()
	if err := db.CreatePost(id, userID, req.Title, req.Content, category, req.ImageURL); err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	post, err := db.GetPostByID(id)
	if err != nil {
		jsonError(w, "internal server error", http.StatusInternalServerError)
		return
	}

	BroadcastAll("new_post", post)
	jsonOK(w, http.StatusCreated, post)
}