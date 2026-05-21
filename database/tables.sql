-- CREATE TABLE users (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(100) NOT NULL,
--     surname VARCHAR(100) NOT NULL,
--     email VARCHAR(150) UNIQUE NOT NULL,
--     password VARCHAR(255) NOT NULL,
--     student_group VARCHAR(50),
--     course INT,
--     direction VARCHAR(150),
--     bio TEXT DEFAULT '',
--     clubs TEXT[] DEFAULT '{}',
--     role VARCHAR(50) DEFAULT 'student'
-- );

-- CREATE TABLE posts (
--     id SERIAL PRIMARY KEY,
--     user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--     title VARCHAR(255) NOT NULL,
--     content TEXT NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE post_likes (
--     user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--     post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
--     PRIMARY KEY (user_id, post_id)
-- );

-- CREATE TABLE clubs (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     description TEXT,
--     meeting_time VARCHAR(255),
--     contacts VARCHAR(255)
-- );

-- CREATE TABLE club_comments (
--     id SERIAL PRIMARY KEY,
--     club_id INT REFERENCES clubs(id) ON DELETE CASCADE,
--     user_id INT REFERENCES users(id) ON DELETE CASCADE,
--     content TEXT NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

