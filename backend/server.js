import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'secret-key';

// --- Middleware ---
app.use(cors({
    origin: [
        'https://shelf-master-nova-6zda.vercel.app', 
        'http://localhost:5173', 
        'http://localhost:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, SECRET_KEY, (err, user) => {
            if (err) return res.sendStatus(403);
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

// --- Health Check ---
app.get('/api/health', (req, res) => {
    res.status(200).send('ShelfMaster Nova API is Running 🚀');
});

// --- Auth ---
app.post('/api/login', async (req, res) => {
    const { username, pin } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user || user.pin !== pin) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        if (user.isSuspended) return res.status(403).json({ error: "Account Suspended" });

        const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY);
        res.json({ user, token });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- User Management ---
app.get('/api/users', authenticate, async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.json(users);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.create({
            data: {
                name: req.body.name,
                username: req.body.username,
                role: req.body.role,
                pin: req.body.pin,
                isSuspended: false
            }
        });
        res.json(user);
    } catch (e) {
        res.status(400).json({ error: "Username might already exist" });
    }
});

app.put('/api/users/:id/status', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.update({
            where: { id: parseInt(req.params.id) },
            data: { isSuspended: req.body.isSuspended }
        });
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/users/:id', authenticate, async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Products ---
app.get('/api/products', authenticate, async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            include: { batches: true, units: true, priceHistory: true }
        });
        res.json(products);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/products', authenticate, async (req, res) => {
    const { batches, units, priceHistory, ...rest } = req.body;

    try {
        const product = await prisma.product.create({
            data: {
                ...rest,
                batches: { create: batches || [] },
                units: { create: units || [] },
                priceHistory: { create: priceHistory || [] }
            },
            include: { batches: true, units: true, priceHistory: true }
        });
        res.json(product);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/products/:id', authenticate, async (req, res) => {
    try {
        await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Catch-All for Frontend ---
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// --- Seed Admin User ---
const seedAdmin = async () => {
    const count = await prisma.user.count();
    if (count === 0) {
        await prisma.user.create({
            data: {
                name: 'Admin User',
                username: 'admin',
                role: 'ADMIN',
                pin: '1234',
            }
        });
        console.log("Seeded Admin User");
    }
};

// --- Start Server ---
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await seedAdmin();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
