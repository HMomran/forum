package db

import "real-time-forum/models"

// CreateUser inserts a new user record.
func CreateUser(u models.User) error {
	_, err := DB.Exec(
		`INSERT INTO users (id, nickname, firstname, lastname, email, age, gender, password)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		u.ID, u.Nickname, u.FirstName, u.LastName, u.Email, u.Age, u.Gender, u.Password,
	)
	return err
}

// GetUserByIdentifier fetches a user matching nickname or email.
func GetUserByIdentifier(identifier string) (models.User, error) {
	var u models.User
	err := DB.QueryRow(
		`SELECT id, nickname, firstname, lastname, email, age, gender, password
		 FROM users WHERE nickname = ? OR email = ?`,
		identifier, identifier,
	).Scan(&u.ID, &u.Nickname, &u.FirstName, &u.LastName, &u.Email, &u.Age, &u.Gender, &u.Password)
	return u, err
}

// GetAllUsersExcept returns id + nickname for every user except myID.
func GetAllUsersExcept(myID string) ([]models.User, error) {
	rows, err := DB.Query(
		`SELECT id, nickname FROM users WHERE id != ? ORDER BY nickname ASC`, myID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		rows.Scan(&u.ID, &u.Nickname)
		users = append(users, u)
	}
	return users, nil
}
