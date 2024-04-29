CREATE SEQUENCE IF NOT EXISTS my_sequence START 100000;

CREATE TABLE IF NOT EXISTS Users (
  id SERIAL PRIMARY KEY,
  images JSONB,
  profile_image VARCHAR(255),
  name VARCHAR(255),
  email VARCHAR(255),
  password VARCHAR(255),  
  device_id VARCHAR(255),  
  gender VARCHAR(255),
  age INT,
  role VARCHAR(255),
  block_status BOOLEAN DEFAULT false, 
  deleted_status BOOLEAN DEFAULT false, 
  deleted_at TIMESTAMP, 
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW(),
  reported_status BOOLEAN DEFAULT false,
  disqualify_status BOOLEAN DEFAULT false,
  alo_level DOUBLE PRECISION DEFAULT 0.75,
  is_profile_completed BOOLEAN DEFAULT false,
  subscription_type VARCHAR(255),
  online_status BOOLEAN DEFAULT false
);    

CREATE TABLE IF NOT EXISTS users_location (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES Users(id),
  latitude DECIMAL,
  longitude DECIMAL,
  complete_address VARCHAR(255),  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_logs (
    id SERIAL PRIMARY KEY,
    current_user_id INTEGER, 
    match_user_id INTEGER,
    compatibilityScore DOUBLE PRECISION
); 

-- ALTER TABLE user_logs
-- ADD COLUMN IF NOT EXISTS replacement_done BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,  
  question VARCHAR(255),  
  placeholder VARCHAR(255), 
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS answers (
  id SERIAL PRIMARY KEY,  
  user_id INT REFERENCES Users(id),  
  question_id INT REFERENCES questions(id),
  answers VARCHAR(400),  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
); 

-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE  IF NOT EXISTS images (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES Users(id),
  cloudinary_id VARCHAR(100),
  url TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS user_previous_roles (
id SERIAL PRIMARY KEY,
user_id INT REFERENCES Users(id), 
users_fetched INT REFERENCES Users(id), 
previous_role VARCHAR(255),  
created_at TIMESTAMP DEFAULT NOW()
); 

CREATE TABLE IF NOT EXISTS user_fetch_log (
  id SERIAL PRIMARY KEY,
  login_user_id INT REFERENCES Users(id),
  user_id INT REFERENCES Users(id), 
  similarity FLOAT,
  card_type VARCHAR(255),  
  created_at TIMESTAMP DEFAULT NOW() 
);

-- ,
--   UNIQUE (user_id, question_id, answer_id)

CREATE TABLE  IF NOT EXISTS report_user (
  id SERIAL PRIMARY KEY,
  reporter_id INT REFERENCES Users(id), 
  reported_id INT REFERENCES Users(id), 
  reason VARCHAR(100), 
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE  IF NOT EXISTS disqualify_user (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES Users(id), 
  disqualify_user_id INT REFERENCES Users(id), 
  reason VARCHAR(100), 
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);  

CREATE TABLE IF NOT EXISTS calls (
  call_id SERIAL PRIMARY KEY,
  caller_id INT REFERENCES users(id),
  receiver_id INT REFERENCES users(id),
  channel_name VARCHAR(255) UNIQUE,
  call_type VARCHAR(20) CHECK (call_type IN ('AUDIO', 'VIDEO')) ,
  call_duration TIME,
  call_status VARCHAR(20) CHECK (call_status IN ('ACCEPT', 'DECLINED', 'NOTANSWERED')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS connections (
  id SERIAL PRIMARY KEY,
  user_id_1 INTEGER REFERENCES Users(id),
  user_id_2 INTEGER REFERENCES Users(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS joker_card (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES Users(id),
  connection_id INTEGER REFERENCES Users(id),
  joker_id INTEGER REFERENCES Users(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chats (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES Users(id),
  receiver_id INTEGER REFERENCES Users(id),
  message VARCHAR(255),
  image_url VARCHAR(255),
  prompt VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_from BOOLEAN DEFAULT false,
  read_status BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS chat_review (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES Users(id),
  receiver_id INTEGER REFERENCES Users(id),
  review VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES Users(id),
  receiver_id INTEGER REFERENCES Users(id),
  type VARCHAR(255),
  message VARCHAR(1000),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS advertizement (
    id SERIAL PRIMARY KEY,
    image VARCHAR(255),
    link VARCHAR(255),
    title VARCHAR(255),
    start_date DATE,
    end_date DATE,
    status VARCHAR(10) CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscription ( 
    id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
    title VARCHAR(255),
    description VARCHAR(255), 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session ( 
    id INT NOT NULL DEFAULT nextval('my_sequence') PRIMARY KEY,
    user_id INTEGER REFERENCES Users(id),
    prompt TEXT, 
    prompt_answer TEXT, 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_rooms (
  id SERIAL PRIMARY KEY,
  room_name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  chat_room_id INTEGER REFERENCES chat_rooms(id),
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);