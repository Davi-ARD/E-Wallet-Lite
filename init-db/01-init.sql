-- 1. DATABASE IDENTITY
CREATE DATABASE identity_db;
\c identity_db;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    profile_pic TEXT,
    role VARCHAR(20) DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. DATABASE WALLET
CREATE DATABASE wallet_db;
\c wallet_db;

CREATE TABLE IF NOT EXISTS wallets (
    user_id INT PRIMARY KEY,
    account_number VARCHAR(12) UNIQUE NOT NULL,
    balance NUMERIC(15, 2) DEFAULT 0 CHECK (balance >= 0),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. DATABASE TRANSACTION
CREATE DATABASE transaction_db;
\c transaction_db;

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id INT,
    counterparty_account VARCHAR(12),
    amount NUMERIC(15, 2),
    type VARCHAR(20),
    status VARCHAR(20),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);