import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();

// Function to test database connection with retries
async function connectDatabase(retries = 5, delay = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("✅ Database connection successful");
      return;
    } catch (error) {
      console.error(`❌ Database connection failed (attempt ${i}/${retries}):`, error.message);
      if (i === retries) {
        console.error("🚨 Failed to connect to database after multiple attempts. Exiting...");
        process.exit(1);
      }
      console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

// Example route
app.get("/", async (req, res) => {
  try {
    const usersCount = await prisma.user.count();
    res.json({ message: "Server is live", users: usersCount });
  } catch (err) {
    console.error("Error fetching users:", err.message);
    res.status(500).json({ error: "Database query failed" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await connectDatabase();
});



