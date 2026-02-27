package models

type User struct {
	ID        string `json:"id"`
	Nickname  string `json:"nickname"`
	FirstName string `json:"firstname"`
	LastName  string `json:"lastname"`
	Email     string `json:"email"`
	Age       int    `json:"age"`
	Gender    string `json:"gender"`
	Password  string `json:"-"`
}

type Post struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id"`
	Nickname  string `json:"nickname"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	Category  string `json:"category"`
	ImageURL  string `json:"image_url"`
	CreatedAt string `json:"created_at"`
	Upvotes   int    `json:"upvotes"`
	Downvotes int    `json:"downvotes"`
	UserVote  int    `json:"user_vote"`
}

type Comment struct {
	ID        string `json:"id"`
	PostID    string `json:"post_id"`
	UserID    string `json:"user_id"`
	Nickname  string `json:"nickname"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
}

type Message struct {
	ID         string `json:"id"`
	SenderID   string `json:"sender_id"`
	ReceiverID string `json:"receiver_id"`
	SenderName string `json:"sender_name"`
	Content    string `json:"content"`
	ImageURL   string `json:"image_url"`
	CreatedAt  string `json:"created_at"`
}