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

// Serve Static Frontend Files (pointing to sibling directory)
// This allows serving the built frontend if located in ../frontend/dist
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

// --- API Routes ---

app.get('/api/health', (req, res) => {
    res.status(200).send('ShelfMaster Nova API is Running 🚀');
});

// --- Auth ---
app.post('/api/login', async (req, res) => {
    const { username, pin } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { username } });
        
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        if (user.pin !== pin) {
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
    try {
        const users = await prisma.user.findMany();
        res.json(users);
    } catch (e) { res.status(500).json({ error: e.message }); }
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
    try {
        const products = await prisma.product.findMany({
            include: {
                batches: true,
                units: true,
                priceHistory: true
            }
        });
        res.json(products);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/products', authenticate, async (req, res) => {
    const { batches, units, priceHistory, ...rest } = req.body;
    
    // Helper to format related data for Prisma
    const batchesData = batches ? batches.map(b => ({ 
        batchNumber: b.batchNumber, 
        expiryDate: b.expiryDate, 
        quantity: b.quantity 
    })) : [];

    const unitsData = units ? units.map(u => ({
        name: u.name,
        multiplier: u.multiplier,
        barcode: u.barcode,
        price: u.price
    })) : [];

    const historyData = priceHistory ? priceHistory.map(h => ({
        date: h.date,
        oldPrice: h.oldPrice,
        newPrice: h.newPrice,
        changedBy: h.changedBy
    })) : [];

    try {
        // If updating, we delete old relations and recreate to keep it simple (or use upsert logic if IDs exist)
        if (req.body.id) {
            // Transactional update
            await prisma.batch.deleteMany({ where: { productId: req.body.id } });
            await prisma.productUnit.deleteMany({ where: { productId: req.body.id } });
            // Note: PriceHistory usually strictly additive, but for edit simplicity we recreate or just add new ones. 
            // Here we assume the frontend sends the full history list.
            await prisma.priceHistory.deleteMany({ where: { productId: req.body.id } });
        }

        const product = await prisma.product.upsert({
            where: { id: req.body.id || 'new' },
            update: {
                ...rest,
                batches: { create: batchesData },
                units: { create: unitsData },
                priceHistory: { create: historyData }
            },
            create: {
                ...rest,
                batches: { create: batchesData },
                units: { create: unitsData },
                priceHistory: { create: historyData }
            }
        });
        res.json(product);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/products/:id', authenticate, async (req, res) => {
    try {
        await prisma.product.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Transactions & Inventory Update ---
app.get('/api/transactions', authenticate, async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany({ 
            orderBy: { date: 'desc' },
            include: { items: true, payments: true }
        });
        res.json(transactions);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/transactions', authenticate, async (req, res) => {
    const { items, payments, ...txData } = req.body;
    
    try {
        const savedTx = await prisma.transaction.create({ 
            data: {
                ...txData,
                items: { create: items },
                payments: { create: payments }
            } 
        });

        if (!txData.isTraining) {
            for (const item of items) {
                // Deduct stock
                // Simple deduction from main quantity. 
                // For batches, complex logic would be needed (FIFO), simplified here to main qty.
                await prisma.product.update({
                    where: { id: item.productId },
                    data: { quantity: { decrement: item.quantity } }
                });
            }
        }

        res.json(savedTx);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: e.message }); 
    }
});

// --- Shifts ---
app.get('/api/shifts', authenticate, async (req, res) => {
    try {
        const shifts = await prisma.shift.findMany();
        res.json(shifts);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/shifts', authenticate, async (req, res) => {
    try {
        const shift = await prisma.shift.create({ data: req.body });
        res.json(shift);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/shifts/:id', authenticate, async (req, res) => {
    try {
        const shift = await prisma.shift.update({
            where: { id: req.params.id },
            data: req.body
        });
        res.json(shift);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Customers ---
app.get('/api/customers', authenticate, async (req, res) => {
    try {
        const customers = await prisma.customer.findMany();
        res.json(customers);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/customers', authenticate, async (req, res) => {
    try {
        const customer = await prisma.customer.upsert({
            where: { id: req.body.id || 'new' },
            update: req.body,
            create: req.body
        });
        res.json(customer);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Settings ---
app.get('/api/settings', authenticate, async (req, res) => {
    try {
        let settings = await prisma.settings.findUnique({ 
            where: { id: 'settings' },
            include: { branches: true }
        });
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
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', authenticate, async (req, res) => {
    const { branches, ...rest } = req.body;
    try {
        // Handle branches separately or create logic
        if (branches) {
            await prisma.branch.deleteMany({ where: { settingsId: 'settings' } });
        }
        
        const settings = await prisma.settings.upsert({
            where: { id: 'settings' },
            update: { 
                ...rest, 
                branches: { create: branches || [] } 
            },
            create: { 
                ...rest, 
                id: 'settings',
                branches: { create: branches || [] } 
            }
        });
        res.json(settings);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Audit Logs ---
app.get('/api/logs', authenticate, async (req, res) => {
    try {
        const logs = await prisma.auditLog.findMany({ 
            orderBy: { date: 'desc' },
            take: 1000 
        });
        res.json(logs);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/logs', authenticate, async (req, res) => {
    try {
        const log = await prisma.auditLog.create({ data: req.body });
        res.json(log);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Catch-all for React Frontend (if built and placed in sibling folder)
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../frontend/dist', 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(404).send('Frontend not found. Ensure it is built in ../frontend/dist');
        }
    });
});

// Seed Initial User if DB is empty
const seed = async () => {
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
            console.log("Seeded Admin User");
        }
    } catch (e) {
        console.warn("Seeding failed (DB might not be ready yet):", e.message);
    }
};

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    seed();
});

// Graceful Shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});