// schema.prisma

// --- Datasource ---
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL") // Reads DATABASE_URL from your .env
}

// --- Generator ---
generator client {
  provider = "prisma-client-js"
}

// --- Models ---
model User {
  id          Int      @id @default(autoincrement())
  name        String
  username    String   @unique
  role        String
  pin         String
  isSuspended Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Product {
  id          Int       @id @default(autoincrement())
  name        String
  description String?
  quantity    Int       @default(0)
  batches     Batch[]
  units       ProductUnit[]
  priceHistory PriceHistory[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Batch {
  id          Int      @id @default(autoincrement())
  productId   Int
  batchNumber String
  expiryDate  DateTime
  quantity    Int
  product     Product  @relation(fields: [productId], references: [id])
}

model ProductUnit {
  id        Int     @id @default(autoincrement())
  productId Int
  name      String
  multiplier Float
  barcode   String?
  price     Float
  product   Product @relation(fields: [productId], references: [id])
}

model PriceHistory {
  id        Int      @id @default(autoincrement())
  productId Int
  date      DateTime @default(now())
  oldPrice  Float
  newPrice  Float
  changedBy String
  product   Product  @relation(fields: [productId], references: [id])
}

model Transaction {
  id       Int       @id @default(autoincrement())
  date     DateTime  @default(now())
  items    TransactionItem[]
  payments Payment[]
  isTraining Boolean @default(false)
}

model TransactionItem {
  id           Int         @id @default(autoincrement())
  transactionId Int
  productId    Int
  quantity     Int
  transaction  Transaction @relation(fields: [transactionId], references: [id])
}

model Payment {
  id           Int         @id @default(autoincrement())
  transactionId Int
  method       String
  amount       Float
  transaction  Transaction @relation(fields: [transactionId], references: [id])
}

model Shift {
  id        Int      @id @default(autoincrement())
  name      String
  startTime DateTime
  endTime   DateTime
}

model Customer {
  id        Int      @id @default(autoincrement())
  name      String
  phone     String?
  email     String?
}

model Settings {
  id          String   @id
  name        String
  address     String
  phone       String?
  currency    String
  taxRate     Float
  receiptFooter String
  branches    Branch[]
}

model Branch {
  id         Int      @id @default(autoincrement())
  settingsId String
  name       String
  address    String
  settings   Settings @relation(fields: [settingsId], references: [id])
}

model AuditLog {
  id       Int      @id @default(autoincrement())
  date     DateTime @default(now())
  userId   Int?
  action   String
  details  String?
}
