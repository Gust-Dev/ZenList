-- Arquivo: db_tasks.sql
-- Conexão: Usuário 'root' / Senha 'root'

CREATE DATABASE IF NOT EXISTS db_integrador;
USE db_integrador;

/* Modelo relacional SQL removido para uso do MongoDB */

--- ZenList - Modelo MongoDB ---

-- Coleção de Usuários
{
    _id: ObjectId,
    username: String,
    password: String, // hash
    email: String
}

-- Coleção de Tarefas
{
    _id: ObjectId,
    userId: ObjectId, // referência ao usuário
    title: String,
    description: String,
    status: String, // "pendente", "concluída"
    createdAt: Date
}

-- Exemplos de comandos MongoDB

// Inserir usuário
 db.users.insertOne({
     username: "usuario1",
     password: "<hash>",
     email: "usuario1@email.com"
 })

// Inserir tarefa
 db.tasks.insertOne({
     userId: ObjectId("..."),
     title: "Estudar para prova",
     description: "Revisar capítulos 1 a 5",
     status: "pendente",
     createdAt: new Date()
 })

// Buscar tarefas de um usuário
 db.tasks.find({ userId: ObjectId("...") })

// Atualizar status de tarefa
 db.tasks.updateOne(
     { _id: ObjectId("...") },
     { $set: { status: "concluída" } }
 )

// Remover tarefa
 db.tasks.deleteOne({ _id: ObjectId("...") })

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