// /backend/db.js
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'shop.db');
export const db = new Database(dbPath);

// 產生標準訂單編號：YYYYMMDD-####（ID 補 4 零）
function formatOrderNo(id, createdAt) {
  const ymd = String(createdAt || '').slice(0, 10).replace(/-/g, '');
  return `${ymd}-${String(id).padStart(4, '0')}`;
}

// 初始化 / 遷移 schema
export function initSchema() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password_hash TEXT,
      provider TEXT NOT NULL DEFAULT 'local',
      provider_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      category TEXT NOT NULL,
      image TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      subtotal_cents INTEGER NOT NULL,
      shipping_cents INTEGER NOT NULL,
      total_cents INTEGER NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      shipping_address TEXT,
      order_no TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id)
    );
  `);

  // ===== Migration: add index on orders.order_no =====
  db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);`);

  // ===== Trigger: 新增訂單後自動寫入 order_no =====
  const hasTrigger = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='trigger' AND name='orders_set_order_no'`)
    .get();
  if (!hasTrigger) {
    db.exec(`
      CREATE TRIGGER orders_set_order_no
      AFTER INSERT ON orders
      BEGIN
        UPDATE orders
        SET order_no = strftime('%Y%m%d', NEW.created_at) || '-' || printf('%04d', NEW.id)
        WHERE id = NEW.id;
      END;
    `);
  }

  // ===== 回填既有沒有 order_no 的資料 =====
  const selectAll = db.prepare(`SELECT id, created_at FROM orders WHERE order_no IS NULL OR order_no = ''`);
  const updateNo = db.prepare(`UPDATE orders SET order_no = @no WHERE id = @id`);
  const tx = db.transaction(() => {
    for (const row of selectAll.all()) {
      updateNo.run({ id: row.id, no: formatOrderNo(row.id, row.created_at) });
    }
  });
  tx();
}

export function resetProducts(products) {
  const insert = db.prepare(`
    INSERT INTO products (id, name, price_cents, category, image)
    VALUES (@id, @name, @price_cents, @category, @image)
  `);
  const truncate = db.prepare(`DELETE FROM products`);
  const tx = db.transaction((rows) => {
    truncate.run();
    rows.forEach(r => insert.run(r));
  });
  tx(products);
}
