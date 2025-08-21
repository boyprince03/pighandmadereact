/**
 * /backend/routes/admin.js
 * Admin routes: 產品 CRUD、訂單 CRUD、儀表板摘要、報表下載、圖片上傳、Excel 批量匯入。
 * 修正重點：
 *  - 儀表板與報表的熱銷商品改用 products.name（不再引用 oi.name）
 *  - ensureSchema() 逐欄 ALTER（SQLite 一次只能 ADD 一欄）
 */
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import sharp from 'sharp';
import xlsx from 'xlsx';
import { db } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// 確保上傳目錄存在
const publicDir = path.join(__dirname, '..', 'public');
const uploadDir = path.join(publicDir, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

// 使用記憶體儲存，後面交給 sharp 處理
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// 將價格字串/數字轉成 cents（整數）
function toCents(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return Math.round(v * 100);
  const s = String(v).replace(/[, \t$\u5143]|NT|TWD/gi, '');
  const num = Number(s);
  if (Number.isNaN(num)) return 0;
  return Math.round(num * 100);
}

// --- 基本 schema 安全檢查（缺欄位就自動補上） ---
function ensureSchema() {
  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all().map(r => r.name);

  // products
  if (!tables.includes('products')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS products(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price_cents INTEGER NOT NULL DEFAULT 0,
        category TEXT DEFAULT '',
        description TEXT DEFAULT '',
        stock INTEGER NOT NULL DEFAULT 0,
        image TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at);
    `);
  } else {
    const cols = db.prepare(`PRAGMA table_info(products)`).all();
    const have = new Set(cols.map(c => c.name));
    if (!have.has('image')) db.exec(`ALTER TABLE products ADD COLUMN image TEXT DEFAULT ''`);
    if (!have.has('description')) db.exec(`ALTER TABLE products ADD COLUMN description TEXT DEFAULT ''`);
    if (!have.has('stock')) db.exec(`ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 0`);
  }

  // orders
  if (!tables.includes('orders')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS orders(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_no TEXT UNIQUE,
        status TEXT NOT NULL DEFAULT 'pending',
        user_id INTEGER,
        customer_name TEXT DEFAULT '',
        customer_phone TEXT DEFAULT '',
        customer_address TEXT DEFAULT '',
        subtotal_cents INTEGER NOT NULL DEFAULT 0,
        shipping_cents INTEGER NOT NULL DEFAULT 0,
        total_cents INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    `);
  } else {
    const cols = db.prepare(`PRAGMA table_info(orders)`).all();
    const have = new Set(cols.map(c => c.name));
    // SQLite 一次只能 ADD 一欄，逐欄檢查
    if (!have.has('customer_name')) db.exec(`ALTER TABLE orders ADD COLUMN customer_name TEXT DEFAULT ''`);
    if (!have.has('customer_phone')) db.exec(`ALTER TABLE orders ADD COLUMN customer_phone TEXT DEFAULT ''`);
    if (!have.has('customer_address')) db.exec(`ALTER TABLE orders ADD COLUMN customer_address TEXT DEFAULT ''`);
  }

  // order_items
  if (!tables.includes('order_items')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS order_items(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER,
        name TEXT DEFAULT '',
        unit_price_cents INTEGER NOT NULL DEFAULT 0,
        quantity INTEGER NOT NULL DEFAULT 1,
        image TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    `);
  } else {
    const cols = db.prepare(`PRAGMA table_info(order_items)`).all();
    const have = new Set(cols.map(c => c.name));
    if (!have.has('product_id')) db.exec(`ALTER TABLE order_items ADD COLUMN product_id INTEGER`);
    if (!have.has('name')) db.exec(`ALTER TABLE order_items ADD COLUMN name TEXT DEFAULT ''`);
    if (!have.has('unit_price_cents')) db.exec(`ALTER TABLE order_items ADD COLUMN unit_price_cents INTEGER NOT NULL DEFAULT 0`);
    if (!have.has('quantity')) db.exec(`ALTER TABLE order_items ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1`);
    if (!have.has('image')) db.exec(`ALTER TABLE order_items ADD COLUMN image TEXT DEFAULT ''`);
    if (!have.has('created_at')) db.exec(`ALTER TABLE order_items ADD COLUMN created_at TEXT DEFAULT (datetime('now'))`);
  }
}
ensureSchema();

// ---------- 圖片上傳（伺服器側統一壓縮成 JPEG） ----------
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '缺少檔案 image' });
    const fname = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const outPath = path.join(uploadDir, fname);
    await sharp(req.file.buffer).rotate().jpeg({ quality: 85 }).toFile(outPath);
    const urlPath = `/uploads/${fname}`;
    res.json({ url: urlPath });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '上傳失敗' });
  }
});

// ---------- 產品 CRUD ----------
router.get('/products', (req, res) => {
  const { q = '', limit = 20, offset = 0 } = req.query;
  const where = [];
  const params = {};
  if (q) { where.push(`(name LIKE @kw OR category LIKE @kw)`); params.kw = `%${q}%`; }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const items = db.prepare(`
    SELECT id, name, price_cents, category, stock, image, created_at, updated_at
    FROM products
    ${whereSql}
    ORDER BY id DESC
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit: Number(limit), offset: Number(offset) });
  const total = db.prepare(`SELECT COUNT(1) AS c FROM products ${whereSql}`).get(params).c;
  res.json({ items, total });
});

router.get('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const p = db.prepare(`SELECT * FROM products WHERE id=?`).get(id);
  if (!p) return res.status(404).json({ error: 'not found' });
  res.json(p);
});

router.post('/products', (req, res) => {
  const { name, price_cents, category = '', description = '', stock = 0, image = '' } = req.body || {};
  if (!name) return res.status(400).json({ error: '缺少 name' });
  const cents = toCents(price_cents);
  const info = db.prepare(`
    INSERT INTO products(name, price_cents, category, description, stock, image, created_at, updated_at)
    VALUES (@name, @price_cents, @category, @description, @stock, @image, datetime('now'), datetime('now'))
  `).run({ name, price_cents: cents, category, description, stock: Number(stock || 0), image });
  const p = db.prepare(`SELECT * FROM products WHERE id=?`).get(info.lastInsertRowid);
  res.status(201).json(p);
});

router.patch('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const old = db.prepare(`SELECT * FROM products WHERE id=?`).get(id);
  if (!old) return res.status(404).json({ error: 'not found' });
  const upd = {
    name: req.body.name ?? old.name,
    price_cents: req.body.price_cents !== undefined ? toCents(req.body.price_cents) : old.price_cents,
    category: req.body.category ?? old.category,
    description: req.body.description ?? old.description,
    stock: req.body.stock !== undefined ? Number(req.body.stock) : old.stock,
    image: req.body.image ?? old.image,
    id
  };
  db.prepare(`
    UPDATE products SET
      name=@name, price_cents=@price_cents, category=@category,
      description=@description, stock=@stock, image=@image,
      updated_at=datetime('now')
    WHERE id=@id
  `).run(upd);
  const p = db.prepare(`SELECT * FROM products WHERE id=?`).get(id);
  res.json(p);
});

router.delete('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare(`DELETE FROM products WHERE id=?`).run(id);
  res.json({ ok: true });
});

// Excel 批量匯入
router.post('/products/import-xlsx', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '缺少檔案 file' });
    const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
    const insert = db.prepare(`
      INSERT INTO products(name, price_cents, category, description, stock, image, created_at, updated_at)
      VALUES (@name, @price_cents, @category, @description, @stock, @image, datetime('now'), datetime('now'))
    `);
    const tx = db.transaction((rows) => {
      for (const r of rows) {
        const rec = {
          name: String(r.name || r.商品名 || r.名稱 || '').trim(),
          price_cents: toCents(r.price || r.price_cents || r.價格 || r.售價),
          category: String(r.category || r.分類 || '').trim(),
          description: String(r.description || r.描述 || '').trim(),
          stock: Number(r.stock || r.庫存 || 0),
          image: String(r.image || r.image_url || r.圖片 || '').trim()
        };
        if (!rec.name) continue;
        insert.run(rec);
      }
    });
    tx(rows);
    res.json({ ok: true, count: rows.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '匯入失敗' });
  }
});

// ---------- 訂單列表 ----------
router.get('/orders', (req, res) => {
  const { status = '', q = '', limit = 20, offset = 0 } = req.query;
  const where = [];
  const params = {};
  if (status) { where.push(`status=@status`); params.status = status; }
  if (q) { where.push(`(order_no LIKE @kw OR customer_name LIKE @kw OR customer_phone LIKE @kw)`); params.kw = `%${q}%`; }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const items = db.prepare(`
    SELECT id, order_no, status, customer_name, customer_phone, total_cents, created_at
    FROM orders
    ${whereSql}
    ORDER BY id DESC
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit: Number(limit), offset: Number(offset) });
  const total = db.prepare(`SELECT COUNT(1) AS c FROM orders ${whereSql}`).get(params).c;
  res.json({ items, total });
});

// 訂單明細
router.get('/orders/:id', (req, res) => {
  const id = Number(req.params.id);
  const o = db.prepare(`SELECT * FROM orders WHERE id=?`).get(id);
  if (!o) return res.status(404).json({ error: 'not found' });
  const items = db.prepare(`SELECT * FROM order_items WHERE order_id=?`).all(id);
  const order = {
    id: o.id,
    status: o.status,
    orderNo: o.order_no || null,
    created_at: o.created_at,
    subtotal_cents: o.subtotal_cents,
    shipping_cents: o.shipping_cents,
    total_cents: o.total_cents,
    customer: {
      name: o.customer_name,
      phone: o.customer_phone,
      address: o.customer_address,
    },
    items: items.map(it => ({
      product_id: it.product_id,
      name: it.name,                           // 若欄位不存在會是 undefined，不影響回傳
      unit_price_cents: it.unit_price_cents,
      quantity: it.quantity,
      image: it.image
    }))
  };
  res.json(order);
});

// 更新訂單
router.patch('/orders/:id', (req, res) => {
  const id = Number(req.params.id);
  const o = db.prepare(`SELECT * FROM orders WHERE id=?`).get(id);
  if (!o) return res.status(404).json({ error: 'not found' });
  const upd = {
    id,
    status: req.body.status ?? o.status,
    customer_name: req.body.customer?.name ?? o.customer_name,
    customer_phone: req.body.customer?.phone ?? o.customer_phone,
    customer_address: req.body.customer?.address ?? o.customer_address,
  };
  db.prepare(`
    UPDATE orders SET status=@status, customer_name=@customer_name,
      customer_phone=@customer_phone, customer_address=@customer_address,
      updated_at=datetime('now')
    WHERE id=@id
  `).run(upd);
  const items = db.prepare(`SELECT * FROM order_items WHERE order_id=?`).all(id);
  const n = db.prepare(`SELECT * FROM orders WHERE id=?`).get(id);
  res.json({
    id: n.id,
    status: n.status,
    orderNo: n.order_no || null,
    created_at: n.created_at,
    subtotal_cents: n.subtotal_cents,
    shipping_cents: n.shipping_cents,
    total_cents: n.total_cents,
    customer: { name: n.customer_name, phone: n.customer_phone, address: n.customer_address },
    items: items.map(it => ({ product_id: it.product_id, name: it.name, unit_price_cents: it.unit_price_cents, quantity: it.quantity, image: it.image }))
  });
});

// 刪除訂單
router.delete('/orders/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare(`DELETE FROM order_items WHERE order_id=?`).run(id);
  db.prepare(`DELETE FROM orders WHERE id=?`).run(id);
  res.json({ ok: true });
});

// ---------- 儀表板摘要 ----------
router.get('/dashboard/summary', (req, res) => {
  const pending = db.prepare(`
    SELECT id, order_no, total_cents, created_at, status, customer_name
    FROM orders
    WHERE status='pending'
    ORDER BY id DESC
    LIMIT 5
  `).all();

  // ★ 改用 products.name，避免沒有 oi.name 欄位時報錯
  const best = db.prepare(`
    SELECT oi.product_id,
           COALESCE(p.name, '未知商品') AS name,
           SUM(oi.quantity) AS qty
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE datetime(o.created_at) >= datetime('now','-30 days')
      AND o.status != 'canceled'
    GROUP BY oi.product_id, name
    ORDER BY qty DESC
    LIMIT 5
  `).all();

  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', created_at) AS ym,
           COUNT(1) AS order_count,
           SUM(total_cents) AS revenue_cents
    FROM orders
    WHERE status != 'canceled'
      AND datetime(created_at) >= datetime('now','start of month','-11 months')
    GROUP BY ym
    ORDER BY ym
  `).all();

  res.json({ pending, best, monthly });
});

// ---------- 下載報表（xlsx/csv） ----------
router.get('/reports/download', (req, res) => {
  const { format = 'xlsx' } = req.query;
  const rows = db.prepare(`
    SELECT o.id, o.order_no, o.status, o.customer_name, o.customer_phone, o.total_cents, o.created_at
    FROM orders o
    ORDER BY o.created_at DESC
  `).all();

  const ws = xlsx.utils.json_to_sheet(rows.map(r => ({
    订单ID: r.id,
    訂單編號: r.order_no,
    狀態: r.status,
    客戶: r.customer_name,
    電話: r.customer_phone,
    總金額_TWD: (r.total_cents||0)/100,
    建立時間: r.created_at
  })));
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Orders');

  // ★ 同樣改用 products.name
  const best = db.prepare(`
    SELECT oi.product_id,
           COALESCE(p.name, '未知商品') AS name,
           SUM(oi.quantity) AS qty,
           SUM(oi.quantity * oi.unit_price_cents) / 100.0 AS revenue_twd
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE o.status != 'canceled'
    GROUP BY oi.product_id, name
    ORDER BY qty DESC
  `).all();
  const ws2 = xlsx.utils.json_to_sheet(best.map(r => ({
    產品ID: r.product_id, 名稱: r.name, 銷量: r.qty, 營收_TWD: r.revenue_twd
  })));
  xlsx.utils.book_append_sheet(wb, ws2, 'BestSellers');

  if (format === 'csv') {
    const csv = xlsx.utils.sheet_to_csv(ws);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
    return res.send(csv);
  }
  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
  res.send(buf);
});

export default router;
