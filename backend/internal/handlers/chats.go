package handlers

import (
	"itstep-network/config"
	"itstep-network/internal/models"
	"net/http"
	"strconv"
	"strings"
	"context"
	"time"

	"github.com/gin-gonic/gin"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func GetChats(c *gin.Context) {
	userID, _ := c.Get("userID")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "last_message_at", Value: -1}})

	cursor, err := config.ChatCollection.Find(ctx, bson.M{
		"member_ids": userID,
	}, opts)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка загрузки чатов", "error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	chats := []models.Chat{}
	allMemberIDs := []int{}

	currentID := userID.(int)

	for cursor.Next(ctx) {
		var doc mongoChatDocument

		if err := cursor.Decode(&doc); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка обработки чатов", "error": err.Error()})
			return
		}

		chat := convertMongoChat(doc)

		unreadCount, err := config.MessageCollection.CountDocuments(ctx, bson.M{
			"chat_id":   doc.ID,
			"sender_id": bson.M{"$ne": currentID},
			"read_by":   bson.M{"$ne": currentID},
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка подсчета непрочитанных сообщений", "error": err.Error()})
			return
		}

		chat.UnreadCount = int(unreadCount)

		chats = append(chats, chat)
		allMemberIDs = append(allMemberIDs, doc.MemberIDs...)
	}

	membersMap, err := getChatMembersByIDs(uniqueIntSlice(allMemberIDs))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка загрузки участников чатов", "error": err.Error()})
		return
	}

	for i := range chats {
		chats[i].Members = []models.ChatMember{}

		for _, id := range chats[i].MemberIDs {
			if member, ok := membersMap[id]; ok {
				chats[i].Members = append(chats[i].Members, member)
			}
		}
	}

	c.JSON(http.StatusOK, chats)
}

func GetOrCreateDirectChat(c *gin.Context) {
	userID, _ := c.Get("userID")
	targetIDStr := c.Param("id")

	currentID := userID.(int)

	targetID, err := strconv.Atoi(targetIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный пользователь"})
		return
	}

	if currentID == targetID {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Нельзя создать чат с самим собой"})
		return
	}

	membersMap, err := getChatMembersByIDs([]int{currentID, targetID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка проверки пользователей", "error": err.Error()})
		return
	}

	if _, ok := membersMap[targetID]; !ok {
		c.JSON(http.StatusNotFound, gin.H{"message": "Пользователь не найден"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{
		"type": "direct",
		"member_ids": bson.M{
			"$all": []int{currentID, targetID},
		},
	}

	var existing mongoChatDocument

	err = config.ChatCollection.FindOne(ctx, filter).Decode(&existing)

	if err == nil {
		chat := convertMongoChat(existing)

		for _, id := range chat.MemberIDs {
			if member, ok := membersMap[id]; ok {
				chat.Members = append(chat.Members, member)
			}
		}

		c.JSON(http.StatusOK, chat)
		return
	}

	if err != mongo.ErrNoDocuments {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка поиска чата", "error": err.Error()})
		return
	}

	now := time.Now()

	newChat := bson.M{
		"type":            "direct",
		"name":            "",
		"description":     "",
		"image_url":       "",
		"club_id":         "",
		"member_ids":      []int{currentID, targetID},
		"last_message":    "",
		"last_message_at": now,
		"created_at":      now,
	}

	insertResult, err := config.ChatCollection.InsertOne(ctx, newChat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка создания чата", "error": err.Error()})
		return
	}

	objectID := insertResult.InsertedID.(primitive.ObjectID)

	chat := models.Chat{
		ID:            objectID.Hex(),
		Type:          "direct",
		Name:          "",
		Description:   "",
		ImageURL:      "",
		ClubID:        "",
		MemberIDs:     []int{currentID, targetID},
		LastMessage:   "",
		LastMessageAt: now,
		CreatedAt:     now,
		Members:       []models.ChatMember{},
	}

	for _, id := range chat.MemberIDs {
		if member, ok := membersMap[id]; ok {
			chat.Members = append(chat.Members, member)
		}
	}

	c.JSON(http.StatusCreated, chat)
}

func CreateGroupChat(c *gin.Context) {
	userID, _ := c.Get("userID")
	currentID := userID.(int)

	var input models.CreateGroupChatInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Введите название и участников чата"})
		return
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Название чата не может быть пустым"})
		return
	}

	memberIDs := uniqueIntSlice(append(input.MemberIDs, currentID))

	if len(memberIDs) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Для группового чата нужен минимум один собеседник"})
		return
	}

	membersMap, err := getChatMembersByIDs(memberIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка проверки участников", "error": err.Error()})
		return
	}

	if len(membersMap) != len(memberIDs) {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некоторые участники не найдены"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	now := time.Now()

	newChat := bson.M{
		"type":            "group",
		"name":            name,
		"description":     "",
		"image_url":       "",
		"club_id":         "",
		"member_ids":      memberIDs,
		"last_message":    "",
		"last_message_at": now,
		"created_at":      now,
	}

	insertResult, err := config.ChatCollection.InsertOne(ctx, newChat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось создать групповой чат", "error": err.Error()})
		return
	}

	objectID := insertResult.InsertedID.(primitive.ObjectID)

	chat := models.Chat{
		ID:            objectID.Hex(),
		Type:          "group",
		Name:          name,
		Description:   "",
		ImageURL:      "",
		ClubID:        "",
		MemberIDs:     memberIDs,
		Members:       []models.ChatMember{},
		LastMessage:   "",
		LastMessageAt: now,
		CreatedAt:     now,
	}

	for _, id := range memberIDs {
		if member, ok := membersMap[id]; ok {
			chat.Members = append(chat.Members, member)
		}
	}

	c.JSON(http.StatusCreated, chat)
}

func UpdateChat(c *gin.Context) {
	userID, _ := c.Get("userID")
	currentID := userID.(int)

	chatID := c.Param("id")

	chatObjectID, err := primitive.ObjectIDFromHex(chatID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный чат"})
		return
	}

	var input models.UpdateChatInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректные данные"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	count, err := config.ChatCollection.CountDocuments(ctx, bson.M{
		"_id":        chatObjectID,
		"member_ids": currentID,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка проверки доступа к чату", "error": err.Error()})
		return
	}

	if count == 0 {
		c.JSON(http.StatusForbidden, gin.H{"message": "Нет доступа к этому чату"})
		return
	}

	_, err = config.ChatCollection.UpdateOne(
		ctx,
		bson.M{"_id": chatObjectID},
		bson.M{
			"$set": bson.M{
				"name":        strings.TrimSpace(input.Name),
				"description": strings.TrimSpace(input.Description),
				"image_url":   input.ImageURL,
			},
		},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось обновить чат", "error": err.Error()})
		return
	}

	chat, err := getChatWithMembersByObjectID(ctx, chatObjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Чат обновлен, но не удалось вернуть новые данные", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Чат обновлен",
		"chat":    chat,
	})
}

func GetMessages(c *gin.Context) {
	userID, _ := c.Get("userID")
	chatID := c.Param("id")

	chatObjectID, err := primitive.ObjectIDFromHex(chatID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный чат"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	count, err := config.ChatCollection.CountDocuments(ctx, bson.M{
		"_id":        chatObjectID,
		"member_ids": userID,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка проверки доступа к чату", "error": err.Error()})
		return
	}

	if count == 0 {
		c.JSON(http.StatusForbidden, gin.H{"message": "Нет доступа к этому чату"})
		return
	}

	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}})

	cursor, err := config.MessageCollection.Find(ctx, bson.M{
		"chat_id": chatObjectID,
	}, opts)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка загрузки сообщений", "error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	messages := []models.Message{}
	senderIDs := []int{}

	for cursor.Next(ctx) {
		var doc mongoMessageDocument

		if err := cursor.Decode(&doc); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка обработки сообщений", "error": err.Error()})
			return
		}

		message := convertMongoMessage(doc)
		messages = append(messages, message)
		senderIDs = append(senderIDs, doc.SenderID)
	}

	membersMap, err := getChatMembersByIDs(uniqueIntSlice(senderIDs))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка загрузки авторов сообщений", "error": err.Error()})
		return
	}

	for i := range messages {
		if sender, ok := membersMap[messages[i].SenderID]; ok {
			messages[i].Sender = sender
		}
	}

	currentID := userID.(int)

	_, _ = config.MessageCollection.UpdateMany(
		ctx,
		bson.M{
			"chat_id":   chatObjectID,
			"sender_id": bson.M{"$ne": currentID},
			"read_by":   bson.M{"$ne": currentID},
		},
		bson.M{
			"$addToSet": bson.M{
				"read_by": currentID,
			},
		},
	)

	c.JSON(http.StatusOK, messages)
}

func SendMessage(c *gin.Context) {
	userID, _ := c.Get("userID")
	chatID := c.Param("id")

	currentID := userID.(int)

	chatObjectID, err := primitive.ObjectIDFromHex(chatID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Некорректный чат"})
		return
	}

	var input models.SendMessageInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Сообщение не может быть пустым"})
		return
	}

	text := strings.TrimSpace(input.Text)
	if text == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Сообщение не может быть пустым"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	count, err := config.ChatCollection.CountDocuments(ctx, bson.M{
		"_id":        chatObjectID,
		"member_ids": currentID,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка проверки доступа к чату", "error": err.Error()})
		return
	}

	if count == 0 {
		c.JSON(http.StatusForbidden, gin.H{"message": "Нет доступа к этому чату"})
		return
	}

	now := time.Now()

	newMessage := bson.M{
		"chat_id":    chatObjectID,
		"sender_id":  currentID,
		"text":       text,
		"created_at": now,
		"read_by":    []int{currentID},
	}

	insertResult, err := config.MessageCollection.InsertOne(ctx, newMessage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Не удалось отправить сообщение", "error": err.Error()})
		return
	}

	_, err = config.ChatCollection.UpdateOne(
		ctx,
		bson.M{"_id": chatObjectID},
		bson.M{
			"$set": bson.M{
				"last_message":    text,
				"last_message_at": now,
			},
		},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Сообщение сохранено, но чат не обновился", "error": err.Error()})
		return
	}

	membersMap, err := getChatMembersByIDs([]int{currentID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка загрузки отправителя", "error": err.Error()})
		return
	}

	message := models.Message{
		ID:        insertResult.InsertedID.(primitive.ObjectID).Hex(),
		ChatID:    chatObjectID.Hex(),
		SenderID:  currentID,
		Text:      text,
		CreatedAt: now,
		Sender:    membersMap[currentID],
	}

	c.JSON(http.StatusCreated, message)
}

func GetUnreadMessagesCount(c *gin.Context) {
	userID, _ := c.Get("userID")
	currentID := userID.(int)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := config.ChatCollection.Find(
		ctx,
		bson.M{"member_ids": currentID},
		options.Find().SetProjection(bson.M{"_id": 1}),
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка загрузки чатов", "error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	chatIDs := []primitive.ObjectID{}

	for cursor.Next(ctx) {
		var item struct {
			ID primitive.ObjectID `bson:"_id"`
		}

		if err := cursor.Decode(&item); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка обработки чатов", "error": err.Error()})
			return
		}

		chatIDs = append(chatIDs, item.ID)
	}

	if len(chatIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{"count": 0})
		return
	}

	count, err := config.MessageCollection.CountDocuments(ctx, bson.M{
		"chat_id":   bson.M{"$in": chatIDs},
		"sender_id": bson.M{"$ne": currentID},
		"read_by":   bson.M{"$ne": currentID},
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка подсчета непрочитанных сообщений", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}
