import express from 'express';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send('ShelfMaster Backend is running!');
});

// Function to connect to DB with retries
async function connectToDatabase(retries = 5, delay = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`⏳ Attempting database connection (attempt ${i}/${retries})...`);
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connection successful!');
      return true;
    } catch (err) {
      console.error(`❌ Database connection failed (attempt ${i}/${retries}):`, err.message);
      if (i < retries) {
        console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        console.error('🚨 Failed to connect to database after multiple attempts.');
        return false;
      }
    }
  }
}

// Start the server only if DB connection is successful
async function startServer() {
  const dbConnected = await connectToDatabase();
  if (!dbConnected) {
    process.exit(1); // Stop server if DB is unreachable
  }

  // Optional: Seeding example (wrap in try/catch)
  try {
    const userCount = await prisma.user.count();
    console.log(`👤 Total users in DB: ${userCount}`);
  } catch (err) {
    console.error('Error fetching users:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();



