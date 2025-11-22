-- Arquivo: db_tasks.sql
-- Conexão: Usuário 'root' / Senha 'root'

-- Criação do Banco de Dados
CREATE DATABASE IF NOT EXISTS db_integrador;
USE db_integrador;

-- Tabela de Usuários (Requisitos: Autenticação, Hash de Senha)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Armazena a senha com hash
    full_name VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Tarefas (Requisitos: CRUD)
CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    status ENUM('pending', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);