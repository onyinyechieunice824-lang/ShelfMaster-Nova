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

// Supabase Client (SERVICE ROLE)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 🔍 Health check
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "ShelfMaster Nova API running 🚀",
  });
});

// 👤 Get all users
app.get("/users", async (req, res) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// 📦 Get all products
app.get("/products", async (req, res) => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// ➕ Add product
app.post("/products", async (req, res) => {
  const { name, price, sku } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: "Name and price are required" });
  }

  const { data, error } = await supabase
    .from("products")
    .insert([{ name, price, sku }])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data);
});

// 📊 Inventory with product info
app.get("/inventory", async (req, res) => {
  const { data, error } = await supabase
    .from("inventory")
    .select(`
      id,
      quantity,
      products (
        id,
        name,
        price
      )
    `);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// 🧾 Create order
app.post("/orders", async (req, res) => {
  const { user_id, total_amount } = req.body;

  if (!user_id || !total_amount) {
    return res.status(400).json({ error: "Missing order data" });
  }

  const { data, error } = await supabase
    .from("orders")
    .insert([{ user_id, total_amount }])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data);
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});



