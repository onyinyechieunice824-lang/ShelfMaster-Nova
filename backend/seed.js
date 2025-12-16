import { createClient } from "@supabase/supabase-js";

// Make sure these are in your .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  try {
    console.log("Seeding database...");

    // ----------- Categories -----------
    const categories = [
      { name: "Beverages", description: "Drinks and juices" },
      { name: "Snacks", description: "Chips, cookies, and more" },
      { name: "Electronics", description: "Gadgets and devices" },
    ];

    for (let cat of categories) {
      await supabase.from("categories").insert(cat);
    }

    // ----------- Products -----------
    const products = [
      { name: "Coca Cola", price: 1.5, stock: 100, category_id: 1 },
      { name: "Pepsi", price: 1.4, stock: 80, category_id: 1 },
      { name: "Lays Chips", price: 0.8, stock: 150, category_id: 2 },
      { name: "Smartphone", price: 250, stock: 10, category_id: 3 },
    ];

    for (let prod of products) {
      await supabase.from("products").insert(prod);
    }

    // ----------- Users -----------
    const users = [
      { name: "Alice", email: "alice@example.com" },
      { name: "Bob", email: "bob@example.com" },
      { name: "Charlie", email: "charlie@example.com" },
    ];

    for (let user of users) {
      await supabase.from("users").insert(user);
    }

    // ----------- Inventory -----------
    const inventory = [
      { product_id: 1, quantity: 100 },
      { product_id: 2, quantity: 80 },
      { product_id: 3, quantity: 150 },
      { product_id: 4, quantity: 10 },
    ];

    for (let item of inventory) {
      await supabase.from("inventory").insert(item);
    }

    console.log("Seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
