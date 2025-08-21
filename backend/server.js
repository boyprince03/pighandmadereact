// /backend/server.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';
import multer from 'multer';
import xlsx from 'xlsx';
import { db, initSchema } from './db.js';

// ★ 新增：檔案系統與路徑（上傳用）
import fs from 'fs';
import path from 'path';

dotenv.config();
initSchema();

const app = express();

// ====== 基本中介層 ======
app.use(express.json());
app.use(morgan('dev'));
app.use(cookieParser());

// 允許前端 Cookie
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: FRONT_ORIGIN, credentials: true }));

// ★ 新增：上傳資料夾與靜態服務
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

const TWD = new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD' });
const priceToDisplay = cents => TWD.format((cents || 0) / 100);

// === 訂單編號工具 ===
function formatOrderNo(id, createdAt) {
  const ymd = String(createdAt || '').slice(0, 10).replace(/-/g, '');
  return `${ymd}-${String(id).padStart(4, '0')}`;
}

// 全形 => 半形（數字 + 常見分隔符號）
function toHalfWidthDigitsAndSeparators(s) {
  return String(s ?? '')
    .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/[／]/g, '/')
    .replace(/[﹣－—–‒―～〜]/g, '-');
}

// 寬鬆解析訂單編號
function parseOrderNo(raw) {
  if (!raw) return null;
  let s = toHalfWidthDigitsAndSeparators(String(raw).trim())
    .replace(/[.\s]/g, '')
    .replace(/[\/]/g, '-')
    .replace(/(\d{4})-(\d{2})-(\d{2})/, '$1$2$3');
  const m = s.match(/^(\d{8})(?:-?)(\d{1,})$/);
  if (!m) return null;
  const id = parseInt(m[2], 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  return { ymd: m[1], id };
}

// ====== JWT / Google 設定 ======
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change';
const COOKIE_OPTS = { httpOnly: true, sameSite: 'lax', secure: false, path: '/' };
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Admin 白名單
const ADMIN_EMAILS = String(process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

const isAdminEmail = (email) => ADMIN_EMAILS.includes(String(email || '').toLowerCase());

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, name: user.name, provider: user.provider }, JWT_SECRET, { expiresIn: '7d' });

const getUserByEmailStmt = db.prepare('SELECT id, name, email, password_hash, provider FROM users WHERE email = ?');
const getUserByIdStmt = db.prepare('SELECT id, name, email, provider FROM users WHERE id = ?');
const insertLocalUserStmt = db.prepare(
  "INSERT INTO users (name, email, password_hash, provider) VALUES (@name, @email, @hash, 'local')"
);
const insertGoogleUserStmt = db.prepare(
  "INSERT INTO users (name, email, provider, provider_id) VALUES (@name, @email, 'google', @pid)"
);

function tryGetUser(req) {
  const tok = req.cookies?.token;
  if (!tok) return null;
  try {
    const payload = jwt.verify(tok, JWT_SECRET);
    const u = getUserByIdStmt.get(payload.id);
    return u || null;
  } catch {
    return null;
  }
}

function ensureAuthed(req, res, next) {
  const u = tryGetUser(req);
  if (!u) return res.status(401).json({ error: '未登入' });
  req.user = u;
  next();
}

function ensureAdmin(req, res, next) {
  const u = tryGetUser(req);
  if (!u) return res.status(401).json({ error: '未登入' });
  if (!isAdminEmail(u.email)) return res.status(403).json({ error: '無權限' });
  req.user = u;
  next();
}

// ====== Health ======
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ====== Auth APIs ======
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: '缺少 email 或 password' });
  const lower = String(email).toLowerCase();
  const exists = getUserByEmailStmt.get(lower);
  if (exists) return res.status(400).json({ error: '此 Email 已被註冊' });
  const hash = bcrypt.hashSync(String(password), 10);
  const info = insertLocalUserStmt.run({ name: name || null, email: lower, hash });
  const user = getUserByIdStmt.get(info.lastInsertRowid);
  const token = signToken(user);
  res.cookie('token', token, { ...COOKIE_OPTS });
  res.json({ ...user, isAdmin: isAdminEmail(user.email) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: '缺少 email 或 password' });
  const lower = String(email).toLowerCase();
  const found = getUserByEmailStmt.get(lower);
  if (!found || found.provider !== 'local') return res.status(400).json({ error: '帳號或密碼錯誤' });
  const ok = bcrypt.compareSync(String(password), found.password_hash || '');
  if (!ok) return res.status(400).json({ error: '帳號或密碼錯誤' });
  const user = getUserByIdStmt.get(found.id);
  const token = signToken(user);
  res.cookie('token', token, { ...COOKIE_OPTS });
  res.json({ ...user, isAdmin: isAdminEmail(user.email) });
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken || !googleClient) return res.status(400).json({ error: '尚未設定 Google 登入' });
    const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const email = String(payload.email || '').toLowerCase();
    const name = payload.name || null;
    const sub = payload.sub;
    let found = getUserByEmailStmt.get(email);
    if (!found) {
      const info = insertGoogleUserStmt.run({ name, email, pid: sub });
      found = getUserByIdStmt.get(info.lastInsertRowid);
    } else {
      found = getUserByIdStmt.get(found.id);
    }
    const token = signToken(found);
    res.cookie('token', token, { ...COOKIE_OPTS });
    res.json({ ...found, isAdmin: isAdminEmail(found.email) });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Google 驗證失敗' });
  }
});

app.get('/api/auth/profile', (req, res) => {
  const user = tryGetUser(req);
  if (!user) return res.status(401).json({ error: '未登入' });
  res.json({ ...user, isAdmin: isAdminEmail(user.email) });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', { ...COOKIE_OPTS, maxAge: 0 });
  res.json({ ok: true });
});

// ====== 產品 APIs（前台） ======
app.get('/api/products', (req, res) => {
  const { category, q } = req.query;
  let sql = `SELECT id, name, price_cents, category, image FROM products`;
  const where = [];
  const params = {};
  if (category && category !== 'all') { where.push(`category = @category`); params.category = category; }
  if (q && q.trim()) { where.push(`LOWER(name) LIKE '%' || LOWER(@q) || '%'`); params.q = q.trim(); }
  if (where.length) sql += ` WHERE ` + where.join(' AND ');
  sql += ` ORDER BY id ASC`;
  const rows = db.prepare(sql).all(params);
  res.json(rows.map(r => ({ ...r, price: r.price_cents / 100, priceText: priceToDisplay(r.price_cents) })));
});

app.get('/api/products/:id', (req, res) => {
  const row = db.prepare(`SELECT id, name, price_cents, category, image FROM products WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ...row, price: row.price_cents / 100, priceText: priceToDisplay(row.price_cents) });
});

// ====== 訂單（前台） ======
// 先放 lookup 再放 :id，避免 :id 吃掉 /lookup
app.get('/api/orders/lookup', (req, res) => {
  const raw = req.query.order_no ?? req.query.orderNo;
  if (!raw) return res.status(400).json({ error: '請提供 order_no' });
  const parsed = parseOrderNo(raw);
  if (!parsed) return res.status(400).json({ error: '訂單編號格式錯誤' });
  const order = db.prepare(`SELECT id, created_at FROM orders WHERE id = ?`).get(parsed.id);
  if (!order) return res.status(404).json({ error: '查無此訂單' });
  const ymd = order.created_at.slice(0, 10).replace(/-/g, '');
  if (ymd !== parsed.ymd) return res.status(404).json({ error: '訂單編號不正確' });
  return res.json(fetchOrderAndItems(order.id));
});

app.get('/api/orders/:id(\\d+)', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: '訂單編號格式錯誤' });
  const data = fetchOrderAndItems(id);
  if (!data) return res.status(404).json({ error: '查無此訂單' });
  res.json(data);
});

app.post('/api/orders', (req, res) => {
  const { customer, items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Cart is empty' });

  const getProduct = db.prepare(`SELECT id, name, price_cents FROM products WHERE id = ?`);
  let subtotal = 0;
  const expand = items.map(it => {
    const p = getProduct.get(it.productId);
    if (!p) throw new Error(`Product ${it.productId} not found`);
    const qty = Math.max(1, parseInt(it.quantity || 1, 10));
    subtotal += p.price_cents * qty;
    return { product: p, qty };
  });

  const shipping = items.length > 0 ? 6000 : 0; // 60元（分）
  const total = subtotal + shipping;

  const insertOrder = db.prepare(`
    INSERT INTO orders (subtotal_cents, shipping_cents, total_cents, customer_name, customer_phone, shipping_address)
    VALUES (@subtotal, @shipping, @total, @name, @phone, @addr)
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents)
    VALUES (@orderId, @productId, @qty, @unit)
  `);

  const tx = db.transaction(() => {
    const info = insertOrder.run({
      subtotal, shipping, total,
      name: customer?.name || null,
      phone: customer?.phone || null,
      addr: customer?.address || null
    });
    const orderId = info.lastInsertRowid;
    expand.forEach(({ product, qty }) => {
      insertItem.run({ orderId, productId: product.id, qty, unit: product.price_cents });
    });
    return orderId;
  });

  try {
    const orderId = tx();
    res.status(201).json({
      id: orderId,
      subtotal_cents: subtotal,
      shipping_cents: shipping,
      total_cents: total,
      subtotalText: priceToDisplay(subtotal),
      shippingText: priceToDisplay(shipping),
      totalText: priceToDisplay(total)
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// 共同：取單 + 組 response
function fetchOrderAndItems(id) {
  const order = db.prepare(`
    SELECT id, created_at, subtotal_cents, shipping_cents, total_cents,
           customer_name, customer_phone, shipping_address, status
    FROM orders WHERE id = ?
  `).get(id);
  if (!order) return null;

  const items = db.prepare(`
    SELECT oi.product_id, oi.quantity, oi.unit_price_cents, p.name, p.image
    FROM order_items oi JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
    ORDER BY oi.id ASC
  `).all(id).map(it => ({
    product_id: it.product_id, name: it.name, image: it.image, quantity: it.quantity,
    unit_price_cents: it.unit_price_cents, unitPriceText: priceToDisplay(it.unit_price_cents),
    line_cents: it.unit_price_cents * it.quantity, lineText: priceToDisplay(it.unit_price_cents * it.quantity)
  }));

  return {
    id: order.id,
    orderNo: formatOrderNo(order.id, order.created_at),
    created_at: order.created_at,
    status: order.status,
    subtotal_cents: order.subtotal_cents,
    shipping_cents: order.shipping_cents,
    total_cents: order.total_cents,
    subtotalText: priceToDisplay(order.subtotal_cents),
    shippingText: priceToDisplay(order.shipping_cents),
    totalText: priceToDisplay(order.total_cents),
    customer: { name: order.customer_name, phone: order.customer_phone, address: order.shipping_address },
    items
  };
}

// ===================== Admin 區 =====================

// 確認權限
app.get('/api/admin/ping', ensureAdmin, (req, res) => res.json({ ok: true }));
// ====== 設定 APIs ======
app.get('/api/settings', (req, res) => {
  const row = db.prepare(`SELECT site_title, footer_notes, footer_links FROM settings WHERE id=1`).get();
  res.json({
    site_title: row?.site_title || '豬豬手做',
    footer_notes: row?.footer_notes ? JSON.parse(row.footer_notes) : [],
    footer_links: row?.footer_links ? JSON.parse(row.footer_links) : []
  });
});

app.put('/api/admin/settings', ensureAdmin, (req, res) => {
  const { site_title, footer_notes, footer_links } = req.body || {};
  db.prepare(`
    UPDATE settings SET site_title=@title, footer_notes=@notes, footer_links=@links WHERE id=1
  `).run({
    title: site_title || '豬豬手做',
    notes: JSON.stringify(footer_notes || []),
    links: JSON.stringify(footer_links || [])
  });
  res.json({ ok: true });
});
// (A) 儀表板/報表
app.get('/api/admin/summary', ensureAdmin, (req, res) => {
  const latestPending = db.prepare(`
    SELECT id, created_at, total_cents, customer_name, status
    FROM orders
    WHERE status='pending'
    ORDER BY created_at DESC
    LIMIT 5
  `).all();

  const topProducts30d = db.prepare(`
    SELECT p.id, p.name, SUM(oi.quantity) AS qty, SUM(oi.quantity * oi.unit_price_cents) AS rev_cents
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE o.created_at >= datetime('now','-30 days') AND o.status <> 'canceled'
    GROUP BY p.id, p.name
    ORDER BY qty DESC
    LIMIT 5
  `).all();

  const latestProducts = db.prepare(`
    SELECT id, name, price_cents, category, image
    FROM products
    ORDER BY id DESC
    LIMIT 5
  `).all();

  res.json({
    latestPending: latestPending.map(o => ({
      ...o,
      totalText: priceToDisplay(o.total_cents)
    })),
    topProducts30d: topProducts30d.map(r => ({
      ...r,
      revText: priceToDisplay(r.rev_cents)
    })),
    latestProducts: latestProducts.map(p => ({
      ...p,
      price: p.price_cents / 100,
      priceText: priceToDisplay(p.price_cents)
    }))
  });
});

app.get('/api/admin/metrics/monthly', ensureAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT strftime('%Y-%m', created_at) AS ym,
           COUNT(*) AS orders_count,
           SUM(total_cents) AS revenue_cents
    FROM orders
    WHERE created_at >= date('now','-12 months') AND status <> 'canceled'
    GROUP BY ym
    ORDER BY ym ASC
  `).all();
  res.json(rows.map(r => ({
    ...r,
    revenueText: priceToDisplay(r.revenue_cents || 0)
  })));
});

// 產生 Excel 報表（月份彙總 + 熱銷）
app.get('/api/admin/reports/monthly.xlsx', ensureAdmin, (req, res) => {
  const ymRows = db.prepare(`
    SELECT strftime('%Y-%m', created_at) AS ym,
           COUNT(*) AS orders_count,
           SUM(total_cents) AS revenue_cents
    FROM orders
    WHERE created_at >= date('now','-12 months') AND status <> 'canceled'
    GROUP BY ym
    ORDER BY ym ASC
  `).all();

  const topRows = db.prepare(`
    SELECT p.id, p.name, SUM(oi.quantity) AS qty, SUM(oi.quantity * oi.unit_price_cents) AS rev_cents
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE o.created_at >= date('now','-12 months') AND o.status <> 'canceled'
    GROUP BY p.id, p.name
    ORDER BY qty DESC
  `).all();

  const wb = xlsx.utils.book_new();
  const s1 = xlsx.utils.aoa_to_sheet([['Month','Orders','Revenue(TWD)'],
    ...ymRows.map(r => [r.ym, r.orders_count, (r.revenue_cents||0)/100])
  ]);
  const s2 = xlsx.utils.aoa_to_sheet([['ProductID','Name','Qty','Revenue(TWD)'],
    ...topRows.map(r => [r.id, r.name, r.qty, (r.rev_cents||0)/100])
  ]);
  xlsx.utils.book_append_sheet(wb, s1, 'Monthly');
  xlsx.utils.book_append_sheet(wb, s2, 'TopProducts');

  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="monthly-report.xlsx"`);
  res.send(buf);
});

// (B) 商品 CRUD + 批量上傳
app.get('/api/admin/products', ensureAdmin, (req, res) => {
  const limit = Math.max(1, Math.min(1000, parseInt(req.query.limit || '100', 10)));
  const rows = db.prepare(`
    SELECT id, name, price_cents, category, image
    FROM products
    ORDER BY id DESC
    LIMIT ?
  `).all(limit);
  res.json(rows.map(r => ({ ...r, price: r.price_cents/100, priceText: priceToDisplay(r.price_cents) })));
});

app.get('/api/admin/products/:id(\\d+)', ensureAdmin, (req, res) => {
  const p = db.prepare(`SELECT id, name, price_cents, category, image FROM products WHERE id = ?`).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json({ ...p, price: p.price_cents/100, priceText: priceToDisplay(p.price_cents) });
});

// ★★★★★ 新增：圖片上傳 API（表單欄位 name = image）
const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg','.jpeg','.png','.webp','.gif'].includes(ext) ? ext : '.jpg';
    const name = `img_${Date.now()}_${Math.random().toString(16).slice(2)}${safeExt}`;
    cb(null, name);
  }
});
const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('僅允許上傳圖片（jpg/png/webp/gif）'));
  }
});
app.post('/api/admin/upload', ensureAdmin, imageUpload.single('image'), (req, res) => {
  const filename = req.file?.filename;
  if (!filename) return res.status(400).json({ error: '未接收到檔案' });
  const base = `${req.protocol}://${req.get('host')}`;
  const url = `${base}/uploads/${filename}`; // 回傳完整可用 URL
  res.json({ url, filename });
});

// 產品建立/更新（原樣）：
app.post('/api/admin/products', ensureAdmin, (req, res) => {
  const { id, name, price, price_cents, category, image } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name 必填' });
  if (!category) return res.status(400).json({ error: 'category 必填' });

  const cents = Number.isFinite(price_cents) ? price_cents : Math.round(Number(price || 0) * 100);
  if (!Number.isFinite(cents) || cents < 0) return res.status(400).json({ error: '價格不正確' });

  let finalId = parseInt(id, 10);
  if (!Number.isFinite(finalId)) {
    const max = db.prepare(`SELECT COALESCE(MAX(id),0) AS max FROM products`).get().max;
    finalId = max + 1;
  }

  db.prepare(`
    INSERT INTO products (id, name, price_cents, category, image)
    VALUES (@id, @name, @price_cents, @category, @image)
  `).run({ id: finalId, name, price_cents: cents, category, image: image || null });

  const p = db.prepare(`SELECT id, name, price_cents, category, image FROM products WHERE id=?`).get(finalId);
  res.status(201).json({ ...p, price: p.price_cents/100, priceText: priceToDisplay(p.price_cents) });
});

app.put('/api/admin/products/:id(\\d+)', ensureAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, price, price_cents, category, image } = req.body || {};
  const cents = Number.isFinite(price_cents) ? price_cents : Math.round(Number(price || 0) * 100);
  if (!Number.isFinite(cents) || cents < 0) return res.status(400).json({ error: '價格不正確' });
  db.prepare(`
    UPDATE products SET
      name=@name, price_cents=@price_cents, category=@category, image=@image
    WHERE id=@id
  `).run({ id, name, price_cents: cents, category, image: image || null });
  const p = db.prepare(`SELECT id, name, price_cents, category, image FROM products WHERE id=?`).get(id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json({ ...p, price: p.price_cents/100, priceText: priceToDisplay(p.price_cents) });
});

// Excel 批量上傳（原本就有的—仍保留用 memoryStorage）:
const upload = multer({ storage: multer.memoryStorage() });
app.post('/api/admin/products/bulk', ensureAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '請上傳 Excel/CSV 檔' });
  const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  const upsert = db.prepare(`
    INSERT INTO products (id, name, price_cents, category, image)
    VALUES (@id, @name, @price_cents, @category, @image)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      price_cents=excluded.price_cents,
      category=excluded.category,
      image=excluded.image
  `);

  const nextIdFn = () => db.prepare(`SELECT COALESCE(MAX(id),0) AS max FROM products`).get().max + 1;

  const tx = db.transaction(() => {
    for (const r of rows) {
      const id = parseInt(r.id, 10);
      const name = String(r.name || '').trim();
      const category = String(r.category || r.分類 || '未分類').trim();
      const image = String(r.image || r.圖片 || '').trim() || null;

      let cents = r.price_cents;
      if (!Number.isFinite(cents)) {
        const price = parseFloat(r.price ?? r.價格 ?? 0);
        cents = Math.round((Number(price) || 0) * 100);
      }
      if (!name) continue;

      const finalId = Number.isFinite(id) ? id : nextIdFn();
      upsert.run({ id: finalId, name, price_cents: cents || 0, category, image });
    }
  });
  tx();

  res.json({ ok: true, count: rows.length });
});

// (C) 訂單 CRUD
app.get('/api/admin/orders', ensureAdmin, (req, res) => {
  const limit = Math.max(1, Math.min(1000, parseInt(req.query.limit || '100', 10)));
  const status = req.query.status;
  let sql = `
    SELECT id, created_at, total_cents, customer_name, customer_phone, status
    FROM orders
  `;
  const where = [];
  const params = {};
  if (status && ['pending','paid','shipped','canceled'].includes(status)) {
    where.push(`status=@status`);
    params.status = status;
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY created_at DESC LIMIT @limit';
  params.limit = limit;

  const rows = db.prepare(sql).all(params);
  res.json(rows.map(o => ({ ...o, totalText: priceToDisplay(o.total_cents) })));
});

app.get('/api/admin/orders/:id(\\d+)', ensureAdmin, (req, res) => {
  const data = fetchOrderAndItems(parseInt(req.params.id, 10));
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

app.patch('/api/admin/orders/:id(\\d+)', ensureAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status, customer } = req.body || {};
  const allowed = ['pending','paid','shipped','canceled'];

  // 更新基本欄位
  db.prepare(`
    UPDATE orders SET
      status = COALESCE(@status, status),
      customer_name = COALESCE(@name, customer_name),
      customer_phone = COALESCE(@phone, customer_phone),
      shipping_address = COALESCE(@addr, shipping_address)
    WHERE id=@id
  `).run({
    id,
    status: allowed.includes(status) ? status : null,
    name: customer?.name ?? null,
    phone: customer?.phone ?? null,
    addr: customer?.address ?? null
  });

  const data = fetchOrderAndItems(id);
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

app.delete('/api/admin/orders/:id(\\d+)', ensureAdmin, (req, res) => {
  db.prepare(`DELETE FROM orders WHERE id=?`).run(req.params.id);
  res.json({ ok: true });
});

// ===================================================

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ API listening on http://localhost:${PORT}`));
