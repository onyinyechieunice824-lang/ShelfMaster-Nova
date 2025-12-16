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
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'secret-key';

// Ensure DATABASE_URL is defined
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgresql://')) {
    console.error('❌ DATABASE_URL is missing or invalid. Make sure it starts with postgresql://');
    process.exit(1);
}

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

// CORS Configuration
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

// Serve Static Frontend Files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// --- Middleware ---
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

// --- Seed Initial Admin ---
const seedAdmin = async () => {
    try {
        const count = await prisma.user.count();
        if (count === 0) {
            await prisma.user.create({
                data: {
                    name: 'Admin User',
                    username: 'admin',
                    role: 'ADMIN',
                    pin: '1234'
                }
            });
            console.log('✅ Seeded Admin User');
        }
    } catch (err) {
        console.warn('⚠️ Seeding failed (DB might not be ready yet):', err.message);
    }
};

// --- Start Server ---
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await seedAdmin();
});

// Graceful Shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

export { app, prisma };

