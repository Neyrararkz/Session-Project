package config

import (
	"database/sql"
	"fmt"
	"log"
	_ "github.com/lib/pq"
)

var DB *sql.DB

func ConnectDatabase() {
	connStr := "host=localhost port=5432 user=postgres password=1234 dbname=itstep_network sslmode=disable"
	
	var err error
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatal("БД недоступна:", err)
	}

	fmt.Println("Успешное подключение к PostgreSQL!")
}