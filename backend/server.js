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

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// Seed admin user (run once)
async function seedAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@shelfmaster.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await prisma.user.create({
        data: {
          name: "Admin",
          email: adminEmail,
          password: hashedPassword,
          role: "ADMIN",
        },
      });
      console.log("Admin user seeded.");
    } else {
      console.log("Admin user already exists.");
    }
  } catch (error) {
    console.error("Seeding failed:", error.message);
  }
}

// Routes
app.get("/", (req, res) => {
  res.send("ShelfMaster Backend is running!");
});

// Example protected route
app.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auth route example
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await seedAdmin();
});


