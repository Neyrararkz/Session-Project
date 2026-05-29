# ITSTEP Social

Децентрализованная web-платформа для колледжа ITSTEP: внутренняя социальная сеть, клубы, новости, друзья, чаты и справочный раздел для студентов.

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

Создайте базу данных PostgreSQL:

```sql
CREATE DATABASE itstep_network;
```

После этого выполните SQL-скрипт:

```txt
database/tables.sql
```

Важно: если строки в `tables.sql` начинаются с `--`, их нужно раскомментировать перед выполнением.

### 2. MongoDB

MongoDB используется для чатов и сообщений.

По умолчанию backend подключается к:

```txt
mongodb://localhost:27017
```

Database:

```txt
itstep
```

Для создания коллекций и индексов можно выполнить:

```bash
mongosh < database/mongodb_init.js
```

Коллекции:

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

## Демо-аккаунты

Если в базе уже созданы тестовые пользователи, можно использовать их для демонстрации.

| Роль          | Email              | Пароль                |
| ------------- | ------------------ | --------------------- |
| Админ         | your_admin_email   | your_admin_password   |
| Студент       | your_student_email | your_student_password |
| Преподаватель | your_teacher_email | your_teacher_password |

Если демо-аккаунтов нет, можно зарегистрировать студента через интерфейс, а роль администратора или преподавателя назначить через базу данных или админ-панель.

## Функции по ТЗ

* Регистрация / вход / JWT-аутентификация
* Роли пользователей: student, teacher, admin
* Профиль пользователя: аватар, био, группа, курс, направление
* Просмотр своего и чужих профилей
* Лента постов
* CRUD собственных постов
* Изображения в постах
* Лайки и комментарии
* Ответы на комментарии
* Друзья: поиск пользователей, заявки, принятие, удаление
* Счётчик входящих заявок
* Личные чаты
* Групповые чаты
* Клубные чаты
* Хранение чатов и сообщений в MongoDB
* Счётчик непрочитанных сообщений
* Клубы: карточки, вступление, выход, участники, обсуждения
* Автоматическое добавление пользователя в чат клуба после вступления
* Новости колледжа
* CRUD новостей для администратора
* Справочный раздел для студентов
* Поиск по постам, пользователям и клубам
* Админ-панель: статистика, пользователи, роли, удаление пользователей

## Структура проекта

```txt
itstep-network/
├── backend/              # Go + Gin API
│   ├── cmd/
│   │   └── api/
│   │       └── main.go
│   ├── config/           # PostgreSQL, MongoDB, config
│   ├── internal/
│   │   ├── handlers/     # auth, users, posts, friends, clubs, news, chats, admin, upload
│   │   ├── middleware/   # JWT middleware
│   │   └── models/       # backend models
│   ├── utils/            # JWT utils
│   └── uploads/          # uploaded images
│
├── frontend/             # React + Vite
│   ├── public/
│   │   └── icons/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       ├── api.js
│       ├── App.jsx
│       ├── main.jsx
│       └── index.css
│
├── database/             # SQL and NoSQL structure
│   ├── tables.sql
│   ├── nosql-structure.md
│   └── mongodb_init.js
│
└── docs/                 # ERD, architecture, Postman, CJM, User Flow
    ├── diagrams/
    └── postman/
```

## Backend architecture

Backend разделён по доменным handler-файлам:

```txt
auth
users
posts
friends
clubs
news
chats
admin
upload
```

Основные части backend:

* `cmd/api/main.go` — точка входа, запуск сервера и регистрация маршрутов
* `config` — подключение PostgreSQL и MongoDB
* `internal/handlers` — обработчики API-запросов
* `internal/middleware` — проверка JWT-токена
* `internal/models` — структуры данных
* `utils` — вспомогательные функции

## Базы данных

В проекте используются две базы данных.

### PostgreSQL

PostgreSQL хранит структурированные данные:

* users
* posts
* post_comments
* post_likes
* clubs
* club_comments
* news
* friendships

PostgreSQL используется для сущностей с чёткими связями, внешними ключами и ограничениями.

### MongoDB

MongoDB хранит коммуникационную часть:

* chats
* messages

MongoDB используется для сообщений и чатов, потому что эти данные быстро растут и удобно хранятся в виде документов.

Связь между PostgreSQL и MongoDB выполняется логически через id пользователей и клубов.

## Документация

* Архитектурная схема: `docs/diagrams/architecture.png`
* ERD и MongoDB schema: `docs/diagrams/erd.png`
* CJM: `docs/diagrams/cjm.png`
* User Flow: `docs/diagrams/user-flow.png`
* Postman collection: `docs/postman/ITSTEP Social.postman_collection.json`
* SQL script: `database/tables.sql`
* NoSQL structure: `database/nosql-structure.md`
* MongoDB init script: `database/mongodb_init.js`

## Postman

Для проверки API используется Postman collection.

Основные группы запросов:

* Auth
* Posts
* Friends
* Clubs
* Chats
* News
* Admin

Environment variables:

```txt
base_url = http://localhost:8080/api/v1
token = JWT обычного пользователя
admin_token = JWT администратора
post_id = id поста
club_id = id клуба
chat_id = id чата
target_user_id = id другого пользователя
```

## Работа с изображениями

Проект поддерживает загрузку изображений для:

* аватаров пользователей
* постов
* клубов
* новостей
* групповых и клубных чатов

Файлы сохраняются в папку:

```txt
backend/uploads
```

И доступны по адресу:

```txt
http://localhost:8080/uploads
```

## Защита проекта

Проект демонстрирует:

* frontend architecture на React
* backend API на Go + Gin
* JWT-аутентификацию
* роли пользователей
* SQL + NoSQL разделение данных
* CRUD для ключевых сущностей
* работу с PostgreSQL
* работу с MongoDB
* Postman-тестирование API
* ERD, архитектурную схему, CJM и User Flow

## Deployment note

Проект подготовлен для локального запуска и демонстрации.

Деплой не выполнялся, так как учебная версия использует локальные подключения к PostgreSQL, MongoDB и локальную папку `uploads`.

## Author

Session Project
ITSTEP Social
2026
