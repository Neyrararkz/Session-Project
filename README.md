# ITSTEP Social

Децентрализованная web-платформа для колледжа ITSTEP: внутренняя соцсеть, клубы, новости, друзья, чаты и справочный раздел для студентов.

## Стек

| Слой          | Технологии                            |
| ------------- | ------------------------------------- |
| Frontend      | React, Vite, React Router, Axios, CSS |
| Backend       | Go, Gin, JWT, bcrypt                  |
| SQL           | PostgreSQL                            |
| NoSQL         | MongoDB                               |
| API testing   | Postman                               |
| Design / Docs | Figma                                 |

## Быстрый старт

### 1. PostgreSQL

Создать базу данных:

```sql
CREATE DATABASE itstep_network;
```

Выполнить SQL-скрипт:

```txt
database/tables.sql
```

### 2. MongoDB

MongoDB используется для чатов и сообщений.

```bash
mongosh < database/mongodb_init.js
```

Database:

```txt
itstep
```

Collections:

```txt
chats
messages
```

### 3. Backend

```bash
cd backend
go mod tidy
go run cmd/api/main.go
```

API:

```txt
http://localhost:8080/api/v1
```

Uploads:

```txt
http://localhost:8080/uploads
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Сайт:

```txt
http://localhost:5173
```

## Первый запуск

После запуска frontend можно зарегистрировать пользователя через интерфейс.

По умолчанию новые пользователи создаются с ролью `student`.
Для проверки функций администратора можно изменить роль пользователя в PostgreSQL:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'your_email@example.com';
```

Доступные роли:

```txt
student
teacher
admin
```

## Функции по ТЗ

* Регистрация / вход / JWT / роли student, teacher, admin
* Профиль: аватар, био, группа, курс, направление, друзья, клубы, посты
* Лента: CRUD постов, изображения, лайки, комментарии
* Друзья: заявки, принятие, удаление
* Чаты: личные, групповые и клубные сообщения в MongoDB
* Клубы: карточки, вступление, участники, обсуждения, чат клуба
* Новости: просмотр для всех, CRUD для администратора
* Поиск: posts, users, clubs
* Админ-панель: статистика, пользователи, роли, удаление пользователей
* Справочный раздел для студентов

## Структура проекта

```txt
itstep-network/
├── backend/          # Go + Gin API
├── frontend/         # React + Vite
├── database/         # SQL, NoSQL structure, MongoDB init
└── docs/             # ERD, architecture, CJM, User Flow, Postman
```

## Документация

* [Архитектура](docs/diagrams/architecture.png)
* [ERD и MongoDB schema](docs/diagrams/erd.png)
* [CJM](docs/diagrams/cjm.png)
* [User Flow](docs/diagrams/user-flow.png)
* [Postman collection](docs/postman/ITSTEP-Social.postman_collection.json)
* [SQL script](database/tables.sql)
* [NoSQL structure](database/nosql-structure.md)
* [MongoDB init script](database/mongodb_init.js)

## Базы данных

PostgreSQL хранит структурированные данные:

```txt
users, posts, post_comments, post_likes, clubs, club_comments, news, friendships
```

MongoDB хранит коммуникационную часть:

```txt
chats, messages
```

Связь между PostgreSQL и MongoDB выполняется логически через id пользователей и клубов.
