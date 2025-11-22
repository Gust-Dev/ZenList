require('dotenv').config();

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const client = new MongoClient(process.env.MONGO_URI || "mongodb://localhost:27017");

let db;

/* ------------------ Conexão MongoDB ------------------ */
async function connectToMongo() {
    try {
        await client.connect();
        db = client.db('zenlist');

        // Garante índice único no email
        await db.collection('users').createIndex({ email: 1 }, { unique: true });

        console.log("MongoDB conectado. http://localhost:" + PORT);
    } catch (e) {
        console.error("Erro ao conectar ao MongoDB:", e);
        process.exit(1);
    }
}

/* ------------------ Middlewares ------------------ */
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                "script-src": ["'self'"],
                "style-src": ["'self'", "'unsafe-inline'"],
            },
        },
    })
);
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: process.env.SESSION_SECRET || "trocar_antes_de_produzir",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 3600000 // 1h
        }
    })
);

app.use(express.static('public'));

/* ------------------ Middleware de Login ------------------ */
function requireLogin(req, res, next) {
    if (!req.session.userId) return res.status(401).redirect('/login.html');

    try {
        req.userObjectId = new ObjectId(req.session.userId);
    } catch {
        return res.status(400).json({ message: "Sessão inválida." });
    }

    next();
}

/* ------------------ Funções auxiliares ------------------ */
function validateEmail(email) {
    return /\S+@\S+\.\S+/.test(email);
}

/* ------------------ Rotas ------------------ */

// Registro
app.post('/api/register', async (req, res) => {
    const { email, password, full_name } = req.body;

    if (!email || !password || password.length < 4) {
        return res.status(400).json({ success: false, message: "Dados inválidos." });
    }

    if (!validateEmail(email)) {
        return res.status(400).json({ success: false, message: "Email inválido." });
    }

    try {
        const password_hash = await bcrypt.hash(password, 12);

        await db.collection('users').insertOne({
            email,
            password_hash,
            full_name: full_name || "",
            created_at: new Date()
        });

        res.status(201).json({ success: true });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: "Email já em uso." });
        }

        res.status(500).json({ success: false, message: "Erro no servidor." });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await db.collection('users').findOne({ email });
        if (!user) return res.status(401).json({ success: false, message: "Credenciais inválidas." });

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(401).json({ success: false, message: "Credenciais inválidas." });

        req.session.userId = user._id.toString();
        res.json({ success: true });
    } catch {
        res.status(500).json({ success: false });
    }
});

// Rota para obter dados do usuário logado
app.get('/api/me', requireLogin, async (req, res) => {
    try {
        const user = await db.collection('users').findOne(
            { _id: req.userObjectId },
            { projection: { full_name: 1, email: 1 } }
        );
        if (!user) return res.status(404).json({ message: "Usuário não encontrado." });
        res.json({ full_name: user.full_name, email: user.email });
    } catch {
        res.status(500).json({ message: "Erro ao obter usuário." });
    }
});

// Listar tarefas
app.get('/api/tasks', requireLogin, async (req, res) => {
    try {
        const tasks = await db.collection('tasks')
            .find(
                { user_id: req.userObjectId },
                { projection: { title: 1, description: 1, status: 1 } }
            )
            .toArray();

        tasks.forEach(t => t.id = t._id.toString());

        res.json(tasks);
    } catch {
        res.status(500).json({ message: "Erro ao buscar tarefas." });
    }
});

// Criar tarefa
app.post('/api/tasks', requireLogin, async (req, res) => {
    const { title, description } = req.body;

    if (!title || title.length < 2) {
        return res.status(400).json({ message: "Título inválido." });
    }

    try {
        const result = await db.collection('tasks').insertOne({
            user_id: req.userObjectId,
            title,
            description: description || "",
            status: "pending",
            created_at: new Date()
        });

        res.status(201).json({
            id: result.insertedId.toString(),
            title,
            description,
            status: "pending"
        });
    } catch {
        res.status(500).json({ message: "Erro ao criar tarefa." });
    }
});

// Marcar tarefa como concluída
app.patch('/api/tasks/:id/complete', requireLogin, async (req, res) => {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID inválido." });
    }
    try {
        const result = await db.collection('tasks').updateOne(
            { _id: new ObjectId(id), user_id: req.userObjectId },
            { $set: { status: "completed" } }
        );
        if (!result.matchedCount) {
            return res.status(404).json({ message: "Tarefa não encontrada." });
        }
        res.json({ success: true });
    } catch {
        res.status(500).json({ message: "Erro ao concluir tarefa." });
    }
});

// Atualizar tarefa
app.put('/api/tasks/:id', requireLogin, async (req, res) => {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID inválido." });
    }

    const { title, description, status } = req.body;

    try {
        const result = await db.collection('tasks').updateOne(
            { _id: new ObjectId(id), user_id: req.userObjectId },
            { $set: { title, description, status } }
        );

        if (!result.matchedCount) {
            return res.status(404).json({ message: "Tarefa não encontrada." });
        }

        res.json({ message: "Atualizada." });
    } catch {
        res.status(500).json({ message: "Erro ao atualizar tarefa." });
    }
});

// Deletar tarefa
app.delete('/api/tasks/:id', requireLogin, async (req, res) => {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID inválido." });
    }

    try {
        const result = await db.collection('tasks').deleteOne({
            _id: new ObjectId(id),
            user_id: req.userObjectId
        });

        if (!result.deletedCount) {
            return res.status(404).json({ message: "Tarefa não encontrada." });
        }

        res.json({ message: "Deletada." });
    } catch {
        res.status(500).json({ message: "Erro ao deletar tarefa." });
    }
});

app.get('/dashboard', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

/* ------------------ Start ------------------ */
connectToMongo().then(() => app.listen(PORT));

