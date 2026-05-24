package config

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

var MongoClient *mongo.Client
var ChatCollection *mongo.Collection
var MessageCollection *mongo.Collection

func ConnectMongo() {
	cfg := LoadConfig()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(cfg.MongoURI)

	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		log.Fatal(err)
	}

	if err := client.Ping(ctx, readpref.Primary()); err != nil {
		log.Fatal(err)
	}

	MongoClient = client

	db := client.Database(cfg.MongoDBName)
	ChatCollection = db.Collection("chats")
	MessageCollection = db.Collection("messages")

	_, _ = ChatCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "member_ids", Value: 1}},
	})

	_, _ = MessageCollection.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "chat_id", Value: 1},
			{Key: "created_at", Value: 1},
		},
	})

	log.Println("Успешное подключение к MongoDB!")
}