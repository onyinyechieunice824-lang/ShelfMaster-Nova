const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'secret-key';

// Allow your Vercel app and Localhost
app.use(cors({
    origin: [
        'https://shelf-master-nova-6zda.vercel.app', 
        'http://localhost:5173', 
        'http://localhost:3000'
    ],
    credentials: true
}));

app.use(express.json());

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

// --- Auth ---
app.post('/api/login', async (req, res) => {
    const { username, pin } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user || user.pin !== pin) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        if (user.isSuspended) {
            return res.status(403).json({ error: "Account Suspended. Contact Administrator." });
        }
        const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY);
        res.json({ user, token });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- User Management ---
app.get('/api/users', authenticate, async (req, res) => {
    const users = await prisma.user.findMany();
    res.json(users);
});

app.post('/api/users', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.create({
            data: {
                id: req.body.id || undefined,
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

app.delete('/api/users/:id', authenticate, async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/users/:id/status', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { isSuspended: req.body.isSuspended }
        });
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Products ---
app.get('/api/products', authenticate, async (req, res) => {
    const products = await prisma.product.findMany();
    res.json(products);
});

app.post('/api/products', authenticate, async (req, res) => {
    const { batches, units, priceHistory, ...rest } = req.body;
    const product = await prisma.product.upsert({
        where: { id: req.body.id || 'new' },
        update: { ...rest, batches: batches || [], units: units || [], priceHistory: priceHistory || [] },
        create: { ...rest, batches: batches || [], units: units || [], priceHistory: priceHistory || [] }
    });
    res.json(product);
});

app.delete('/api/products/:id', authenticate, async (req, res) => {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true });
});

// --- Transactions ---
app.get('/api/transactions', authenticate, async (req, res) => {
    const transactions = await prisma.transaction.findMany({ orderBy: { date: 'desc' } });
    res.json(transactions);
});

app.post('/api/transactions', authenticate, async (req, res) => {
    const { items, payments, ...txData } = req.body;
    const savedTx = await prisma.transaction.create({ data: { ...txData, items, payments } });
    if (!txData.isTraining) {
        for (const item of items) {
            const product = await prisma.product.findUnique({ where: { id: item.productId } });
            if (product) {
                await prisma.product.update({
                    where: { id: item.productId },
                    data: { quantity: { decrement: item.quantity } }
                });
            }
        }
    }
    res.json(savedTx);
});

// --- Shifts ---
app.get('/api/shifts', authenticate, async (req, res) => {
    const shifts = await prisma.shift.findMany();
    res.json(shifts);
});

app.post('/api/shifts', authenticate, async (req, res) => {
    const shift = await prisma.shift.create({ data: req.body });
    res.json(shift);
});

app.put('/api/shifts/:id', authenticate, async (req, res) => {
    const shift = await prisma.shift.update({ where: { id: req.params.id }, data: req.body });
    res.json(shift);
});

// --- Customers ---
app.get('/api/customers', authenticate, async (req, res) => {
    const customers = await prisma.customer.findMany();
    res.json(customers);
});

app.post('/api/customers', authenticate, async (req, res) => {
    const customer = await prisma.customer.upsert({
        where: { id: req.body.id || 'new' },
        update: req.body,
        create: req.body
    });
    res.json(customer);
});

// --- Settings ---
app.get('/api/settings', authenticate, async (req, res) => {
    let settings = await prisma.settings.findUnique({ where: { id: 'settings' } });
    if (!settings) {
        settings = {
            id: 'settings',
            name: 'ShelfMaster Store',
            address: 'Default Address',
            phone: '',
            currency: '₦',
            taxRate: 7.5,
            receiptFooter: 'Powered by ShelfMaster Nova',
            branches: []
        };
    }
    res.json(settings);
});

app.post('/api/settings', authenticate, async (req, res) => {
    const { branches, ...rest } = req.body;
    const settings = await prisma.settings.upsert({
        where: { id: 'settings' },
        update: { ...rest, branches: branches || [] },
        create: { ...rest, branches: branches || [], id: 'settings' }
    });
    res.json(settings);
});

// --- Audit Logs ---
app.get('/api/logs', authenticate, async (req, res) => {
    const logs = await prisma.auditLog.findMany({ orderBy: { date: 'desc' }, take: 1000 });
    res.json(logs);
});

app.post('/api/logs', authenticate, async (req, res) => {
    const log = await prisma.auditLog.create({ data: req.body });
    res.json(log);
});

// Seed initial admin user
const seed = async () => {
    const count = await prisma.user.count();
    if (count === 0) {
        await prisma.user.create({
            data: { name: 'Admin User', username: 'admin', role: 'ADMIN', pin: '1234' }
        });
        console.log("Seeded Admin User");
    }
};
seed();

// Gracefully close Prisma on exit (Render-friendly)
process.on('SIGINT', async () => { await prisma.$disconnect(); process.exit(); });
process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(); });

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

