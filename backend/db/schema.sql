-- Users table: stores platform login accounts
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Databases table: metadata for every Postgres database provisioned by the platform
CREATE TABLE databases (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER REFERENCES users(id),
  db_name VARCHAR(100) UNIQUE NOT NULL,
  db_user VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table: tracks every meaningful action taken on the platform
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backups table: tracks backup files created for each database
CREATE TABLE backups (
  id SERIAL PRIMARY KEY,
  database_id INTEGER REFERENCES databases(id),
  file_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);