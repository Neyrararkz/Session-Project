package handlers

import (
	"itstep-network/config"
	"itstep-network/internal/models"
	"strconv"
	"context"
	"time"

	"github.com/lib/pq"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type mongoChatDocument struct {
	ID            primitive.ObjectID `bson:"_id,omitempty"`
	Type          string             `bson:"type"`
	Name          string             `bson:"name"`
	Description   string             `bson:"description"`
	ImageURL      string             `bson:"image_url"`
	ClubID        string             `bson:"club_id"`
	MemberIDs     []int              `bson:"member_ids"`
	LastMessage   string             `bson:"last_message"`
	LastMessageAt time.Time          `bson:"last_message_at"`
	CreatedAt     time.Time          `bson:"created_at"`
}

type mongoMessageDocument struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	ChatID    primitive.ObjectID `bson:"chat_id"`
	SenderID  int                `bson:"sender_id"`
	Text      string             `bson:"text"`
	CreatedAt time.Time         `bson:"created_at"`
	ReadBy    []int              `bson:"read_by"`
}

func getChatMembersByIDs(ids []int) (map[int]models.ChatMember, error) {
	result := map[int]models.ChatMember{}

	if len(ids) == 0 {
		return result, nil
	}

	query := `
		SELECT
			id,
			name,
			surname,
			COALESCE(student_group, ''),
			COALESCE(avatar_url, ''),
			role
		FROM users
		WHERE id = ANY($1)
	`

	rows, err := config.DB.Query(query, pq.Array(ids))
	if err != nil {
		return result, err
	}
	defer rows.Close()

	for rows.Next() {
		var member models.ChatMember

		if err := rows.Scan(
			&member.ID,
			&member.Name,
			&member.Surname,
			&member.Group,
			&member.AvatarURL,
			&member.Role,
		); err != nil {
			return result, err
		}

		result[member.ID] = member
	}

	return result, nil
}

func uniqueIntSlice(items []int) []int {
	seen := map[int]bool{}
	result := []int{}

	for _, item := range items {
		if !seen[item] {
			seen[item] = true
			result = append(result, item)
		}
	}

	return result
}

func convertMongoChat(chatDoc mongoChatDocument) models.Chat {
	return models.Chat{
		ID:            chatDoc.ID.Hex(),
		Type:          chatDoc.Type,
		Name:          chatDoc.Name,
		Description:   chatDoc.Description,
		ImageURL:      chatDoc.ImageURL,
		ClubID:        chatDoc.ClubID,
		MemberIDs:     chatDoc.MemberIDs,
		LastMessage:   chatDoc.LastMessage,
		LastMessageAt: chatDoc.LastMessageAt,
		CreatedAt:     chatDoc.CreatedAt,
	}
}

func convertMongoMessage(messageDoc mongoMessageDocument) models.Message {
	return models.Message{
		ID:        messageDoc.ID.Hex(),
		ChatID:    messageDoc.ChatID.Hex(),
		SenderID:  messageDoc.SenderID,
		Text:      messageDoc.Text,
		CreatedAt: messageDoc.CreatedAt,
	}
}


func getChatWithMembersByObjectID(ctx context.Context, chatObjectID primitive.ObjectID) (models.Chat, error) {
	var doc mongoChatDocument

	err := config.ChatCollection.FindOne(ctx, bson.M{"_id": chatObjectID}).Decode(&doc)
	if err != nil {
		return models.Chat{}, err
	}

	chat := convertMongoChat(doc)

	membersMap, err := getChatMembersByIDs(chat.MemberIDs)
	if err != nil {
		return models.Chat{}, err
	}

	chat.Members = []models.ChatMember{}

	for _, id := range chat.MemberIDs {
		if member, ok := membersMap[id]; ok {
			chat.Members = append(chat.Members, member)
		}
	}

	return chat, nil
}

func syncClubChatMembership(clubID string, userID int, action string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if action == "leave" {
		_, err := config.ChatCollection.UpdateOne(
			ctx,
			bson.M{
				"type":    "club",
				"club_id": clubID,
			},
			bson.M{
				"$pull": bson.M{
					"member_ids": userID,
				},
			},
		)

		return err
	}

	clubIntID, err := strconv.Atoi(clubID)
	if err != nil {
		return err
	}

	var club models.Club

	query := `
		SELECT
			id,
			name,
			COALESCE(description, ''),
			COALESCE(image_url, '')
		FROM clubs
		WHERE id = $1
	`

	err = config.DB.QueryRow(query, clubIntID).Scan(
		&club.ID,
		&club.Name,
		&club.Description,
		&club.ImageURL,
	)

	if err != nil {
		return err
	}

	var existing mongoChatDocument

	err = config.ChatCollection.FindOne(ctx, bson.M{
		"type":    "club",
		"club_id": clubID,
	}).Decode(&existing)

	if err == mongo.ErrNoDocuments {
		now := time.Now()

		_, err = config.ChatCollection.InsertOne(ctx, bson.M{
			"type":            "club",
			"name":            club.Name,
			"description":     club.Description,
			"image_url":       club.ImageURL,
			"club_id":         clubID,
			"member_ids":      []int{userID},
			"last_message":    "",
			"last_message_at": now,
			"created_at":      now,
		})

		return err
	}

	if err != nil {
		return err
	}

	_, err = config.ChatCollection.UpdateOne(
		ctx,
		bson.M{
			"type":    "club",
			"club_id": clubID,
		},
		bson.M{
			"$addToSet": bson.M{
				"member_ids": userID,
			},
			"$set": bson.M{
				"name":        club.Name,
				"description": club.Description,
				"image_url":   club.ImageURL,
			},
		},
	)

	return err
}