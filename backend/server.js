import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to check DB connection
async function checkDbConnection(retries = 5) {
  for (let i = 1; i <= retries; i++) {
    try {
      const { data, error } = await supabase.from("users").select("*").limit(1);
      if (error) throw error;
      console.log("✅ Database connection successful!");
      return true;
    } catch (err) {
      console.error(`❌ Database connection failed (attempt ${i}/${retries}):`, err.message);
      if (i < retries) {
        console.log("⏳ Retrying in 3 seconds...");
        await new Promise((res) => setTimeout(res, 3000));
      } else {
        console.error("🚨 Failed to connect to database after multiple attempts.");
        process.exit(1);
      }
    }
  }
}

// Routes

// Get all users
app.get("/users", async (req, res) => {
  try {
    const { data, error } = await supabase.from("users").select("*");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all products
app.get("/products", async (req, res) => {
  try {
    const { data, error } = await supabase.from("products").select("*");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all categories
app.get("/categories", async (req, res) => {
  try {
    const { data, error } = await supabase.from("categories").select("*");
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Seed endpoint (optional)
app.post("/seed", async (req, res) => {
  try {
    // Categories
    const categories = [
      { name: "Beverages", description: "Drinks and juices" },
      { name: "Snacks", description: "Chips, cookies, and more" },
      { name: "Electronics", description: "Gadgets and devices" },
    ];
    for (let cat of categories) await supabase.from("categories").insert(cat);

    // Products
    const products = [
      { name: "Coca Cola", price: 1.5, stock: 100, category_id: 1 },
      { name: "Pepsi", price: 1.4, stock: 80, category_id: 1 },
      { name: "Lays Chips", price: 0.8, stock: 150, category_id: 2 },
      { name: "Smartphone", price: 250, stock: 10, category_id: 3 },
    ];
    for (let prod of products) await supabase.from("products").insert(prod);

    // Users
    const users = [
      { name: "Alice", email: "alice@example.com" },
      { name: "Bob", email: "bob@example.com" },
      { name: "Charlie", email: "charlie@example.com" },
    ];
    for (let user of users) await supabase.from("users").insert(user);

    res.json({ message: "✅ Database seeded successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await checkDbConnection();
});



