CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    student_group VARCHAR(50),
    course INT,
    direction VARCHAR(150),
    bio TEXT DEFAULT '',
    clubs TEXT[] DEFAULT '{}',
    role VARCHAR(50) DEFAULT 'student',
    avatar_url VARCHAR(255) DEFAULT ''
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    image_urls TEXT[] DEFAULT '{}'
);

CREATE TABLE post_comments (
    id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parent_id INT REFERENCES post_comments(id) ON DELETE CASCADE
);

CREATE TABLE post_likes (
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, post_id)
);

CREATE TABLE clubs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    meeting_time VARCHAR(255),
    contacts VARCHAR(255),
    image_url VARCHAR(255) DEFAULT ''
);

CREATE TABLE club_comments (
    id SERIAL PRIMARY KEY,
    club_id INT REFERENCES clubs(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parent_id INT REFERENCES club_comments(id) ON DELETE CASCADE
);

CREATE TABLE news (
    id SERIAL PRIMARY KEY,
    author_id INT REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE friendships (
    id SERIAL PRIMARY KEY,
    requester_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (requester_id <> receiver_id),
    CHECK (status IN ('pending', 'accepted'))
);

CREATE UNIQUE INDEX unique_friendship_pair
ON friendships (
    LEAST(requester_id, receiver_id),
    GREATEST(requester_id, receiver_id)
);
