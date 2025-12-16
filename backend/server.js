import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();
const DB_RETRY_LIMIT = 5;
const DB_RETRY_DELAY = 5000; // 5 seconds

// Function to test DB connectivity
async function testDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connection successful.");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    return false;
  }
}

// Retry DB connection
async function connectWithRetry(attempt = 1) {
  const connected = await testDatabaseConnection();
  if (connected) return true;

  if (attempt < DB_RETRY_LIMIT) {
    console.log(`Retrying database connection (${attempt + 1}/${DB_RETRY_LIMIT})...`);
    await new Promise((resolve) => setTimeout(resolve, DB_RETRY_DELAY));
    return connectWithRetry(attempt + 1);
  } else {
    console.error("🚨 Failed to connect to database after multiple attempts.");
    return false;
  }
}

// Seed default admin if not exists
async function seedAdmin() {
  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: "admin@shelfmaster.com" },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await prisma.user.create({
        data: {
          name: "Admin",
          email: "admin@shelfmaster.com",
          password: hashedPassword,
          role: "ADMIN",
        },
      });
      console.log("✅ Admin user created successfully.");
    } else {
      console.log("ℹ️ Admin user already exists.");
    }
  } catch (error) {
    console.error("Seeding failed:", error.message);
  }
}

// Start server only if DB is reachable
async function startServer() {
  const dbConnected = await connectWithRetry();
  if (!dbConnected) process.exit(1);

  await seedAdmin();

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer();


