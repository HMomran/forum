package db

import (
	"database/sql"
	"strings"

	"real-time-forum/models"
)

const postSelectBase = `
	SELECT
		p.id, p.user_id, u.nickname, p.title, p.content, p.category, p.created_at,
		COALESCE(SUM(CASE WHEN v.value =  1 THEN 1 ELSE 0 END), 0) AS upvotes,
		COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 ELSE 0 END), 0) AS downvotes,
		COALESCE(MAX(CASE WHEN v.user_id = ? THEN v.value ELSE 0 END), 0) AS user_vote
	FROM posts p
	JOIN users u ON u.id = p.user_id
	LEFT JOIN votes v ON v.post_id = p.id`

func scanPosts(rows *sql.Rows) ([]models.Post, error) {
	defer rows.Close()
	posts := []models.Post{}
	for rows.Next() {
		var p models.Post
		rows.Scan(&p.ID, &p.UserID, &p.Nickname, &p.Title, &p.Content,
			&p.Category, &p.CreatedAt, &p.Upvotes, &p.Downvotes, &p.UserVote)
		posts = append(posts, p)
	}
	return posts, nil
}

// ListAllPosts returns every post, ordered by orderBy.
func ListAllPosts(viewerID, orderBy string) ([]models.Post, error) {
	rows, err := DB.Query(postSelectBase+` GROUP BY p.id ORDER BY `+orderBy, viewerID)
	if err != nil {
		return nil, err
	}
	return scanPosts(rows)
}

// ListMinePosts returns posts created by viewerID.
func ListMinePosts(viewerID, orderBy string) ([]models.Post, error) {
	rows, err := DB.Query(
		postSelectBase+` WHERE p.user_id = ? GROUP BY p.id ORDER BY `+orderBy,
		viewerID, viewerID,
	)
	if err != nil {
		return nil, err
	}
	return scanPosts(rows)
}

// ListLikedPosts returns posts up-voted by viewerID.
func ListLikedPosts(viewerID, orderBy string) ([]models.Post, error) {
	rows, err := DB.Query(
		postSelectBase+` WHERE EXISTS (SELECT 1 FROM votes lv WHERE lv.post_id = p.id AND lv.user_id = ? AND lv.value = 1) GROUP BY p.id ORDER BY `+orderBy,
		viewerID, viewerID,
	)
	if err != nil {
		return nil, err
	}
	return scanPosts(rows)
}

// ListPostsByCategories returns posts matching any of the given categories.
func ListPostsByCategories(viewerID string, cats []string, orderBy string) ([]models.Post, error) {
	args := []any{viewerID}
	conditions := []string{}
	for _, c := range cats {
		c = strings.TrimSpace(c)
		if c != "" {
			conditions = append(conditions, `INSTR(',' || p.category || ',', ',' || ? || ',') > 0`)
			args = append(args, c)
		}
	}
	if len(conditions) == 0 {
		return ListAllPosts(viewerID, orderBy)
	}
	rows, err := DB.Query(
		postSelectBase+` WHERE `+strings.Join(conditions, " OR ")+` GROUP BY p.id ORDER BY `+orderBy,
		args...,
	)
	if err != nil {
		return nil, err
	}
	return scanPosts(rows)
}

// CreatePost inserts a new post record.
func CreatePost(id, userID, title, content, category string) error {
	_, err := DB.Exec(
		`INSERT INTO posts (id, user_id, title, content, category) VALUES (?, ?, ?, ?, ?)`,
		id, userID, title, content, category,
	)
	return err
}

// GetPostByID fetches a single post by ID (upvotes/downvotes/user_vote default to 0).
func GetPostByID(postID string) (models.Post, error) {
	var p models.Post
	err := DB.QueryRow(`
		SELECT p.id, p.user_id, u.nickname, p.title, p.content, p.category, p.created_at,
		       0, 0, 0
		FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?`, postID,
	).Scan(&p.ID, &p.UserID, &p.Nickname, &p.Title, &p.Content,
		&p.Category, &p.CreatedAt, &p.Upvotes, &p.Downvotes, &p.UserVote)
	return p, err
}

// GetPostOwnerID returns the user_id of the post author, or "" if not found.
func GetPostOwnerID(postID string) (string, error) {
	var ownerID string
	err := DB.QueryRow(`SELECT user_id FROM posts WHERE id = ?`, postID).Scan(&ownerID)
	return ownerID, err
}

// DeletePostCascade removes a post and all its votes and comments.
func DeletePostCascade(postID string) error {
	DB.Exec(`DELETE FROM votes    WHERE post_id = ?`, postID)
	DB.Exec(`DELETE FROM comments WHERE post_id = ?`, postID)
	_, err := DB.Exec(`DELETE FROM posts WHERE id = ?`, postID)
	return err
}
