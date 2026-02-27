package db

import "real-time-forum/models"

// GetMessages returns up to limit messages between two users (newest-first from DB,
// reversed to chronological order before returning).
func GetMessages(myID, withID string, limit, offset int) ([]models.Message, error) {
	rows, err := DB.Query(`
		SELECT m.id, m.sender_id, m.receiver_id, u.nickname, m.content, m.image_url, m.created_at
		FROM messages m
		JOIN users u ON u.id = m.sender_id
		WHERE (m.sender_id = ? AND m.receiver_id = ?)
		   OR (m.sender_id = ? AND m.receiver_id = ?)
		ORDER BY m.created_at DESC
		LIMIT ? OFFSET ?`,
		myID, withID, withID, myID, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	msgs := []models.Message{}
	for rows.Next() {
		var m models.Message
		rows.Scan(&m.ID, &m.SenderID, &m.ReceiverID, &m.SenderName, &m.Content, &m.ImageURL, &m.CreatedAt)
		msgs = append(msgs, m)
	}

	// reverse to chronological order
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	return msgs, nil
}

// CreateMessage inserts a new private message.
func CreateMessage(id, senderID, receiverID, content, imageURL string) error {
	_, err := DB.Exec(
		`INSERT INTO messages (id, sender_id, receiver_id, content, image_url) VALUES (?, ?, ?, ?, ?)`,
		id, senderID, receiverID, content, imageURL,
	)
	return err
}

// GetMessageByID fetches a single message with its sender's nickname.
func GetMessageByID(msgID string) (models.Message, error) {
	var m models.Message
	err := DB.QueryRow(`
		SELECT m.id, m.sender_id, m.receiver_id, u.nickname, m.content, m.image_url, m.created_at
		FROM messages m JOIN users u ON u.id = m.sender_id
		WHERE m.id = ?`, msgID,
	).Scan(&m.ID, &m.SenderID, &m.ReceiverID, &m.SenderName, &m.Content, &m.ImageURL, &m.CreatedAt)
	return m, err
}

// GetLastMessageTimeBetween returns the created_at of the most recent message between
// two users. Returns "" if no messages exist.
func GetLastMessageTimeBetween(userID1, userID2 string) string {
	var lastMsg string
	DB.QueryRow(`
		SELECT created_at FROM messages
		WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
		ORDER BY created_at DESC LIMIT 1`,
		userID1, userID2, userID2, userID1,
	).Scan(&lastMsg)
	return lastMsg
}
