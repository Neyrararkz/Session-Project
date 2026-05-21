package repository

import (
	"database/sql"
)

// Repository будет отвечать за все обращения к PostgreSQL
type Repository struct {
	DB *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{DB: db}
}

// Позже мы перенесем сюда логику из handlers.go
// Например: func (r *Repository) CreateUser(...) error { ... }