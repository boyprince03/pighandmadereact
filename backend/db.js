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

// 初始化 / 遷移 schema
export function initSchema() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    -- =================================================================
    -- Table: users
    -- =================================================================
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      phone TEXT,
      address TEXT,
      password_hash TEXT,
      provider TEXT NOT NULL DEFAULT 'local',
      provider_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    -- =================================================================
    -- Table: products
    -- =================================================================
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      price_cents INTEGER NOT NULL, -- 使用 cents (分) 來儲存價格以避免浮點數問題
      category TEXT NOT NULL,
      image TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

    -- =================================================================
    -- Table: orders
    -- 優化點 1: 使用 GENERATED COLUMN 自動生成 order_no
    -- 這取代了原本的 TRIGGER 和 backfill 腳本，更簡潔可靠。
    -- 'STORED' 表示該欄位值會被實體儲存，並可以被索引。
    -- =================================================================
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      subtotal_cents INTEGER NOT NULL,
      shipping_cents INTEGER NOT NULL,
      total_cents INTEGER NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      shipping_address TEXT,
      order_no TEXT GENERATED ALWAYS AS (
        strftime('%Y%m%d', created_at) || '-' || printf('%04d', id)
      ) STORED,
      status TEXT NOT NULL DEFAULT 'pending' -- 直接在此定義，簡化遷移
    );
    -- 為常用查詢欄位建立索引
    CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

    -- =================================================================
    -- Table: order_items
    -- ON DELETE CASCADE: 當訂單被刪除時，相關的訂單項目也會自動刪除
    -- =================================================================
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price_cents INTEGER NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    -- =================================================================
    -- Table: settings
    -- 優化點 2: 為 JSON 欄位增加 CHECK 約束，確保資料格式正確
    -- =================================================================
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      site_title TEXT NOT NULL DEFAULT '豬豬手做',
      footer_notes TEXT CHECK (json_valid(footer_notes)),
      footer_links TEXT CHECK (json_valid(footer_links))
    );
    -- 插入預設值，如果已存在則忽略
    INSERT INTO settings (id, site_title, footer_notes, footer_links)
    VALUES (1, '豬豬手做', '[]', '[]')
    ON CONFLICT(id) DO NOTHING;
  `);

  // ===== 簡易遷移範例: 為 orders 表新增欄位 (如果舊版資料庫沒有) =====
  // 雖然在 CREATE TABLE 已直接加入 status，但保留此段作為未來遷移的範例
  const cols = db.prepare(`PRAGMA table_info('orders')`).all();
  const hasStatus = cols.some(c => c.name === 'status');
  if (!hasStatus) {
    db.exec(`ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'`);
    // 如果是透過 ALTER 新增，記得也要補上索引
    db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`);
  }
}

/**
 * 重置所有產品資料
 * @param {Array<Object>} products - 產品陣列
 */
export function resetProducts(products) {
  // 使用 "upsert" 語法，如果 id 已存在則更新，否則插入
  const insert = db.prepare(`
    INSERT INTO products (id, name, price_cents, category, image)
    VALUES (@id, @name, @price_cents, @category, @image)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      price_cents=excluded.price_cents,
      category=excluded.category,
      image=excluded.image
  `);
  
  // 為了確保最終產品列表與傳入的 products 完全一致，先刪除所有產品
  const truncate = db.prepare(`DELETE FROM products`);

  // 使用交易確保操作的原子性：要麼全部成功，要麼全部失敗
  const tx = db.transaction((rows) => {
    truncate.run();
    for (const row of rows) {
      insert.run(row);
    }
  });

  tx(products);
}