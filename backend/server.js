// /backend/server.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';
import { db, initSchema } from './db.js';

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
    .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)) // 全形數字 -> 半形
    .replace(/[／]/g, '/')  // 全形斜線 -> /
    .replace(/[﹣－—–‒―～〜]/g, '-'); // 各式破折號/波浪線 -> -
}

// 寬鬆解析：20250821-0001 / 2025-08-21-1 / 2025/08/21-1 / ２０２５／０８／２１－１ / 202508210001 都可
function parseOrderNo(raw) {
  if (!raw) return null;
  let s = toHalfWidthDigitsAndSeparators(String(raw).trim())
    .replace(/[.\s]/g, '')   // 去掉 . 與空白
    .replace(/[\/]/g, '-')   // 斜線統一成 -
    .replace(/(\d{4})-(\d{2})-(\d{2})/, '$1$2$3'); // yyyy-mm-dd -> yyyymmdd

  const m = s.match(/^(\d{8})(?:-?)(\d{1,})$/);
  if (!m) return null;
  const id = parseInt(m[2], 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  return { ymd: m[1], id };
}

// ====== JWT / Google 設定（略同原本） ======
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change';
const COOKIE_OPTS = { httpOnly: true, sameSite: 'lax', secure: false, path: '/' };
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

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

// ====== Health ======
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ====== Auth APIs（略） ======
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
  res.json(user);
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
  res.json(user);
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
    res.json(found);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Google 驗證失敗' });
  }
});

app.get('/api/auth/profile', (req, res) => {
  const user = tryGetUser(req);
  if (!user) return res.status(401).json({ error: '未登入' });
  res.json(user);
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', { ...COOKIE_OPTS, maxAge: 0 });
  res.json({ ok: true });
});

// ====== 產品 APIs ======
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

// ====== 訂單 ======

// 👉 先放「lookup」再放「:id」，避免被 :id 把 /lookup 吃掉
/** 以訂單編號查詢
 * GET /api/orders/lookup?order_no=20250821-0001
 */
app.get('/api/orders/lookup', (req, res) => {
  const raw = req.query.order_no ?? req.query.orderNo;
  if (!raw) return res.status(400).json({ error: '請提供 order_no' });

  const parsed = parseOrderNo(raw);
  if (!parsed) return res.status(400).json({ error: '訂單編號格式錯誤' });

  const order = db.prepare(`SELECT id, created_at FROM orders WHERE id = ?`).get(parsed.id);
  if (!order) return res.status(404).json({ error: '查無此訂單' });

  // 比對日期（YYYYMMDD 必須一致）
  const ymd = order.created_at.slice(0, 10).replace(/-/g, '');
  if (ymd !== parsed.ymd) return res.status(404).json({ error: '訂單編號不正確' });

  return res.json(fetchOrderAndItems(order.id));
});

/** 以 ID 取單（只接受數字） */
app.get('/api/orders/:id(\\d+)', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: '訂單編號格式錯誤' });
  const data = fetchOrderAndItems(id);
  if (!data) return res.status(404).json({ error: '查無此訂單' });
  res.json(data);
});

// 建單
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
           customer_name, customer_phone, shipping_address
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ API listening on http://localhost:${PORT}`));
