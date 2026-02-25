package db

import "real-time-forum/models"

// ListComments returns all comments for a post, oldest first.
func ListComments(postID string) ([]models.Comment, error) {
	rows, err := DB.Query(`
		SELECT c.id, c.post_id, c.user_id, u.nickname, c.content, c.created_at
		FROM comments c JOIN users u ON u.id = c.user_id
		WHERE c.post_id = ? ORDER BY c.created_at ASC`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	comments := []models.Comment{}
	for rows.Next() {
		var c models.Comment
		rows.Scan(&c.ID, &c.PostID, &c.UserID, &c.Nickname, &c.Content, &c.CreatedAt)
		comments = append(comments, c)
	}
	return comments, nil
}

// PostExists returns true if a post with the given ID exists.
func PostExists(postID string) bool {
	var count int
	DB.QueryRow(`SELECT COUNT(*) FROM posts WHERE id = ?`, postID).Scan(&count)
	return count > 0
}

// CreateComment inserts a new comment record.
func CreateComment(id, postID, userID, content string) error {
	_, err := DB.Exec(
		`INSERT INTO comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)`,
		id, postID, userID, content,
	)
	return err
}

// GetCommentByID fetches a single comment with its author's nickname.
func GetCommentByID(commentID string) (models.Comment, error) {
	var c models.Comment
	err := DB.QueryRow(`
		SELECT c.id, c.post_id, c.user_id, u.nickname, c.content, c.created_at
		FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`, commentID,
	).Scan(&c.ID, &c.PostID, &c.UserID, &c.Nickname, &c.Content, &c.CreatedAt)
	return c, err
}

// GetCommentOwnerID returns the user_id of the comment author, or "" if not found.
func GetCommentOwnerID(commentID string) (string, error) {
	var ownerID string
	err := DB.QueryRow(`SELECT user_id FROM comments WHERE id = ?`, commentID).Scan(&ownerID)
	return ownerID, err
}

// DeleteComment removes a comment by ID.
func DeleteComment(commentID string) error {
	_, err := DB.Exec(`DELETE FROM comments WHERE id = ?`, commentID)
	return err
}
