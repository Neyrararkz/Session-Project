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

* [Архитектура](docs/diagrams/Architecture-Scheme.png)
* [ERD и MongoDB schema](docs/diagrams/ERD.png)
* [CJM](docs/diagrams/CJM.png)
* [User Flow](docs/diagrams/User-Flows.png)
* [Figma](docs/diagrams/figma-link.md)
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


## Скриншоты интерфейса
Лента
<img width="1280" height="612" alt="image" src="https://github.com/user-attachments/assets/8945bfb9-162c-447d-893a-1a2cbb558918" />
Профиль
<img width="1920" height="920" alt="image" src="https://github.com/user-attachments/assets/6788e793-9aaa-4b42-a34b-81a9d2f8c69d" />
Друзья
<img width="1920" height="921" alt="image" src="https://github.com/user-attachments/assets/d08cad28-07da-4a4d-af73-102ee5078459" />
Сообщения
<img width="1920" height="919" alt="image" src="https://github.com/user-attachments/assets/ca204d60-ea65-4928-8b08-a13ce1297046" />
Клубы
<img width="1920" height="919" alt="image" src="https://github.com/user-attachments/assets/39a22324-d820-42c6-a4d1-5f355f7dd90a" />

