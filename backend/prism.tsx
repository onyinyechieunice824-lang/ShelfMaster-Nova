// prisma/schema.prisma

// --- Datasource (Supabase PostgreSQL) ---
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL") // Prisma will read your DB connection string from env
}

// --- Prisma Client Generator ---
generator client {
  provider = "prisma-client-js"
}

// --- Models ---

model User {
  id          String   @id @default(cuid())
  name        String
  username    String   @unique
  role        String
  pin         String
  isSuspended Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Product {
  id          String   @id @default(cuid())
  name        String
  quantity    Int
  price       Float
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Transaction {
  id        String   @id @default(cuid())
  date      DateTime @default(now())
  items     Json
  payments  Json
  createdAt DateTime @default(now())
}

model Customer {
  id        String   @id @default(cuid())
  name      String
  phone     String
  createdAt DateTime @default(now())
}

model Shift {
  id        String   @id @default(cuid())
  name      String
  startTime DateTime
  endTime   DateTime
  createdAt DateTime @default(now())
}

model Settings {
  id           String   @id
  name         String
  address      String
  phone        String
  currency     String
  taxRate      Float
  receiptFooter String
  branches     Json
}
