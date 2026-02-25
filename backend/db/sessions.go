package db

// GetUserIDByToken returns the user ID for a session token, or "" if not found.
func GetUserIDByToken(token string) string {
	var userID string
	DB.QueryRow(`SELECT user_id FROM sessions WHERE token = ?`, token).Scan(&userID)
	return userID
}

// DeleteSessionsByUserID removes all sessions for a user (single-session enforcement).
func DeleteSessionsByUserID(userID string) {
	DB.Exec(`DELETE FROM sessions WHERE user_id = ?`, userID)
}

// CreateSession inserts a new session token.
func CreateSession(token, userID string) error {
	_, err := DB.Exec(`INSERT INTO sessions (token, user_id) VALUES (?, ?)`, token, userID)
	return err
}

// DeleteSessionByToken removes a single session by its token.
func DeleteSessionByToken(token string) {
	DB.Exec(`DELETE FROM sessions WHERE token = ?`, token)
}
