// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || "secret-key";

// Middleware
app.use(cors());
app.use(express.json());

// --- Auth Middleware ---
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
};

// --- Health Check ---
app.get("/api/health", (req, res) => {
  res.json({ status: "ShelfMaster API running 🚀" });
});

// --- Authentication ---
app.post("/api/login", async (req, res) => {
  const { username, pin } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(pin, user.pin);
    if (!isMatch) return res.status(401).json({ error: "Invalid PIN" });

    if (user.isSuspended) return res.status(403).json({ error: "Account Suspended" });

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: "8h" });
    res.json({ user, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Users ---
app.get("/api/users", authenticate, async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

app.post("/api/users", authenticate, async (req, res) => {
  try {
    const hashedPin = await bcrypt.hash(req.body.pin, 10);
    const user = await prisma.user.create({
      data: { ...req.body, pin: hashedPin, isSuspended: false },
    });
    res.json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put("/api/users/:id/status", authenticate, async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isSuspended: req.body.isSuspended },
  });
  res.json(user);
});

app.delete("/api/users/:id", authenticate, async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// --- Products ---
app.get("/api/products", authenticate, async (req, res) => {
  const products = await prisma.product.findMany({ include: { batches: true, units: true, priceHistory: true } });
  res.json(products);
});

app.post("/api/products", authenticate, async (req, res) => {
  const { batches, units, priceHistory, ...rest } = req.body;
  try {
    const product = await prisma.product.create({
      data: {
        ...rest,
        batches: { create: batches || [] },
        units: { create: units || [] },
        priceHistory: { create: priceHistory || [] },
      },
    });
    res.json(product);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/products/:id", authenticate, async (req, res) => {
  await prisma.product.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// --- Transactions ---
app.get("/api/transactions", authenticate, async (req, res) => {
  const transactions = await prisma.transaction.findMany({ include: { items: true, payments: true }, orderBy: { date: "desc" } });
  res.json(transactions);
});

app.post("/api/transactions", authenticate, async (req, res) => {
  const { items, payments, ...txData } = req.body;
  try {
    const tx = await prisma.transaction.create({
      data: { ...txData, items: { create: items }, payments: { create: payments } },
    });

    // Deduct stock
    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    res.json(tx);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// --- Customers ---
app.get("/api/customers", authenticate, async (req, res) => {
  const customers = await prisma.customer.findMany();
  res.json(customers);
});

app.post("/api/customers", authenticate, async (req, res) => {
  const customer = await prisma.customer.upsert({
    where: { id: req.body.id || "new" },
    update: req.body,
    create: req.body,
  });
  res.json(customer);
});

// --- Shifts ---
app.get("/api/shifts", authenticate, async (req, res) => {
  const shifts = await prisma.shift.findMany();
  res.json(shifts);
});

app.post("/api/shifts", authenticate, async (req, res) => {
  const shift = await prisma.shift.create({ data: req.body });
  res.json(shift);
});

app.put("/api/shifts/:id", authenticate, async (req, res) => {
  const shift = await prisma.shift.update({ where: { id: req.params.id }, data: req.body });
  res.json(shift);
});

// --- Settings ---
app.get("/api/settings", authenticate, async (req, res) => {
  const settings = await prisma.settings.findUnique({ where: { id: "settings" }, include: { branches: true } });
  res.json(settings);
});

app.post("/api/settings", authenticate, async (req, res) => {
  const { branches, ...rest } = req.body;
  const settings = await prisma.settings.upsert({
    where: { id: "settings" },
    update: { ...rest, branches: { create: branches || [] } },
    create: { id: "settings", ...rest, branches: { create: branches || [] } },
  });
  res.json(settings);
});

// --- Audit Logs ---
app.get("/api/logs", authenticate, async (req, res) => {
  const logs = await prisma.auditLog.findMany({ take: 1000, orderBy: { date: "desc" } });
  res.json(logs);
});

app.post("/api/logs", authenticate, async (req, res) => {
  const log = await prisma.auditLog.create({ data: req.body });
  res.json(log);
});

// --- Seed Admin ---
const seedAdmin = async () => {
  try {
    const admin = await prisma.user.findUnique({ where: { username: "admin" } });
    if (!admin) {
      const hashedPin = await bcrypt.hash("1234", 10);
      await prisma.user.create({ data: { name: "Admin", username: "admin", role: "ADMIN", pin: hashedPin } });
      console.log("Admin seeded: username=admin, pin=1234");
    }
  } catch (e) {
    console.error("Seeding failed:", e);
  }
};

// --- Start Server ---
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await seedAdmin();
});

