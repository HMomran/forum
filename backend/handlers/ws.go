package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"real-time-forum/db"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Client struct {
	conn   *websocket.Conn
	userID string
	send   chan []byte
}

type Hub struct {
	mu      sync.RWMutex
	clients map[string]*Client
}

var hub = &Hub{
	clients: make(map[string]*Client),
}

type WSMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type SendMessagePayload struct {
	ReceiverID string `json:"receiver_id"`
	Content    string `json:"content"`
	ImageURL   string `json:"image_url"`
}

func ServeWS(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromSession(r)
	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("ws upgrade error:", err)
		return
	}

	client := &Client{
		conn:   conn,
		userID: userID,
		send:   make(chan []byte, 256),
	}

	hub.mu.Lock()
	if old, exists := hub.clients[userID]; exists {
		kick, _ := json.Marshal(WSMessage{Type: "force_logout", Payload: mustMarshal("logged in elsewhere")})
		select {
		case old.send <- kick:
		default:
		}
		go func(old *Client) {
			time.Sleep(2 * time.Second)
			old.conn.Close()
		}(old)
	}
	hub.clients[userID] = client
	hub.mu.Unlock()

	broadcastPresence()
	sendUserList(client)

	go client.writePump()
	client.readPump()

	hub.mu.Lock()
	if hub.clients[userID] == client {
		delete(hub.clients, userID)
	}
	hub.mu.Unlock()
	close(client.send)
	broadcastPresence()
}

func (c *Client) readPump() {
	defer c.conn.Close()

	for {
		_, raw, err := c.conn.ReadMessage()
		if err != nil {
			break
		}

		var msg WSMessage
		if err := json.Unmarshal(raw, &msg); err != nil {
			continue
		}

		switch msg.Type {
		case "send_message":
			c.handleSendMessage(msg.Payload)
		}
	}
}

func (c *Client) writePump() {
	for data := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, data); err != nil {
			break
		}
	}
}

func (c *Client) handleSendMessage(raw json.RawMessage) {
	var p SendMessagePayload
	if err := json.Unmarshal(raw, &p); err != nil {
		return
	}

	// Must have either text content or an image (or both)
	if p.Content == "" && p.ImageURL == "" {
		return
	}
	if p.ReceiverID == "" {
		return
	}

	msgID := uuid.NewString()
	if err := db.CreateMessage(msgID, c.userID, p.ReceiverID, p.Content, p.ImageURL); err != nil {
		log.Println("insert message error:", err)
		return
	}

	msg, err := db.GetMessageByID(msgID)
	if err != nil {
		log.Println("fetch message error:", err)
		return
	}

	envelope, _ := json.Marshal(WSMessage{
		Type:    "new_message",
		Payload: mustMarshal(msg),
	})

	hub.mu.RLock()
	receiver, online := hub.clients[p.ReceiverID]
	hub.mu.RUnlock()

	if online {
		select {
		case receiver.send <- envelope:
		default:
		}
	}

	select {
	case c.send <- envelope:
	default:
	}

	broadcastPresence()
}

type UserStatus struct {
	ID       string `json:"id"`
	Nickname string `json:"nickname"`
	Online   bool   `json:"online"`
	LastMsg  string `json:"last_msg"`
}

func broadcastPresence() {
	hub.mu.RLock()
	allClients := make([]*Client, 0, len(hub.clients))
	for _, c := range hub.clients {
		allClients = append(allClients, c)
	}
	hub.mu.RUnlock()

	for _, c := range allClients {
		sendUserList(c)
	}
}

// BroadcastAll sends a WS envelope to every connected client.
func BroadcastAll(msgType string, payload any) {
	envelope, _ := json.Marshal(WSMessage{
		Type:    msgType,
		Payload: mustMarshal(payload),
	})
	hub.mu.RLock()
	clients := make([]*Client, 0, len(hub.clients))
	for _, c := range hub.clients {
		clients = append(clients, c)
	}
	hub.mu.RUnlock()
	for _, c := range clients {
		select {
		case c.send <- envelope:
		default:
		}
	}
}

func sendUserList(c *Client) {
	usersFromDB, err := db.GetAllUsersExcept(c.userID)
	if err != nil {
		return
	}

	hub.mu.RLock()
	onlineIDs := make(map[string]bool)
	for id := range hub.clients {
		onlineIDs[id] = true
	}
	hub.mu.RUnlock()

	var users []UserStatus
	for _, u := range usersFromDB {
		users = append(users, UserStatus{
			ID:       u.ID,
			Nickname: u.Nickname,
			Online:   onlineIDs[u.ID],
			LastMsg:  db.GetLastMessageTimeBetween(c.userID, u.ID),
		})
	}

	envelope, _ := json.Marshal(WSMessage{
		Type:    "user_list",
		Payload: mustMarshal(users),
	})

	select {
	case c.send <- envelope:
	default:
	}
}

func mustMarshal(v any) json.RawMessage {
	b, _ := json.Marshal(v)
	return b
}