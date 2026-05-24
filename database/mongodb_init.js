db = db.getSiblingDB("itstep");

if (!db.getCollectionNames().includes("chats")) {
  db.createCollection("chats", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["type", "member_ids", "created_at"],
        properties: {
          type: {
            bsonType: "string",
            enum: ["direct", "group", "club"]
          },
          name: {
            bsonType: "string"
          },
          description: {
            bsonType: "string"
          },
          image_url: {
            bsonType: "string"
          },
          club_id: {
            bsonType: "string"
          },
          member_ids: {
            bsonType: "array",
            items: {
              bsonType: "int"
            }
          },
          last_message: {
            bsonType: "string"
          },
          last_message_at: {
            bsonType: "date"
          },
          created_at: {
            bsonType: "date"
          }
        }
      }
    }
  });
}

if (!db.getCollectionNames().includes("messages")) {
  db.createCollection("messages", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["chat_id", "sender_id", "text", "created_at"],
        properties: {
          chat_id: {
            bsonType: "objectId"
          },
          sender_id: {
            bsonType: "int"
          },
          text: {
            bsonType: "string"
          },
          created_at: {
            bsonType: "date"
          },
          read_by: {
            bsonType: "array",
            items: {
              bsonType: "int"
            }
          }
        }
      }
    }
  });
}

db.chats.createIndex({ type: 1 });
db.chats.createIndex({ member_ids: 1 });
db.chats.createIndex(
  { type: 1, club_id: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: "club"
    }
  }
);

db.messages.createIndex({ chat_id: 1, created_at: 1 });
db.messages.createIndex({ sender_id: 1 });
db.messages.createIndex({ read_by: 1 });