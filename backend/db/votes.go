package db

// GetVote returns the vote ID and value for a user on a post.
// If no vote exists, voteID will be "".
func GetVote(postID, userID string) (voteID string, value int) {
	DB.QueryRow(
		`SELECT id, value FROM votes WHERE post_id = ? AND user_id = ?`,
		postID, userID,
	).Scan(&voteID, &value)
	return
}

// CreateVote inserts a new vote record.
func CreateVote(id, postID, userID string, value int) error {
	_, err := DB.Exec(
		`INSERT INTO votes (id, post_id, user_id, value) VALUES (?, ?, ?, ?)`,
		id, postID, userID, value,
	)
	return err
}

// DeleteVote removes a vote by ID.
func DeleteVote(voteID string) error {
	_, err := DB.Exec(`DELETE FROM votes WHERE id = ?`, voteID)
	return err
}

// UpdateVote changes the value of an existing vote.
func UpdateVote(voteID string, value int) error {
	_, err := DB.Exec(`UPDATE votes SET value = ? WHERE id = ?`, value, voteID)
	return err
}

// GetVoteSummary returns upvotes, downvotes, and the calling user's vote for a post.
func GetVoteSummary(postID, userID string) (upvotes, downvotes, userVote int) {
	DB.QueryRow(`
		SELECT
			COALESCE(SUM(CASE WHEN value =  1 THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END), 0),
			COALESCE(MAX(CASE WHEN user_id = ? THEN value ELSE 0 END), 0)
		FROM votes WHERE post_id = ?`, userID, postID,
	).Scan(&upvotes, &downvotes, &userVote)
	return
}
