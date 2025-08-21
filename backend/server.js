// backend/server.js
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
app.use(express.json());
app.use(morgan('dev'));
app.use(cookieParser());

// CORS
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: FRONT_ORIGIN, credentials: true }));

// ----- helpers -----
const TWD = new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD' });
const priceToDisplay = cents => TWD.format(cents / 100);

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

// ----- utils -----
function formatOrderNo(id, createdAt) {
  const ymd = String(createdAt || '').slice(0, 10).replace(/-/g, '');
  return `${ymd}-${String(id).padStart(4, '0')}`;
}

/** 寬鬆解析訂單編號：
 * 支援 20250820-0003 / 2025-08-20-0003 / 2025/08/20-0003 / 202508200003；全形破折號可用。
 */
function parseOrderNo(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  // 全形破折號 → 半形
  s = s.replace(/[－—–‒―]/g, '-');
  // 去掉日期分隔符（. /），把 yyyy-mm-dd 變 yyyymmdd
  s = s.replace(/[./]/g, '').replace(/(\d{4})-(\d{2})-(\d{2})/, '$1$2$3');
  let m = s.match(/^(\d{8})-?(\d+)$/);
  if (!m) {
    const digits = s.replace(/\D/g, '');
    m = digits.match(/^(\d{8})(\d{1,})$/);
  }
  if (!m) return null;
  const idNum = parseInt(m[2], 10);
  if (!Number.isFinite(idNum) || idNum <= 0) return null;
  return { ymd: m[1], id: idNum };
}

// 全形數字 → 半形
function toHalfWidthDigits(str) {
  return String(str ?? '').replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
}

/** 正規化電話：
 * - 去空白與非數字
 * - +886/886 開頭轉成 0
 * - 全形數字轉半形
 */
function normalizePhone(input) {
  let s = toHalfWidthDigits(input).trim();
  s = s.replace(/\D/g, ''); // 留數字
  if (s.startsWith('886') && s.length >= 11) s = '0' + s.slice(3);
  return s;
}

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

// ----- health -----
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ----- auth -----
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

// ----- products -----
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

// ----- orders -----
app.post('/api/orders', (req, res) => {
  const { customer, items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Cart is empty' });

  const getProduct = db.prepare(`SELECT id, name, price_cents FROM products WHERE id = ?`);
  let subtotal = 0;
  const expand = items.map(it => {
    const p = getProduct.get(it.productId);
    if (!p) throw new Error(`Product ${it.productId} not found`);
    const qty = Math.max(1, parseInt(it.quantity || 1, 10));
    const line = p.price_cents * qty;
    subtotal += line;
    return { product: p, qty };
  });

  const shipping = items.length > 0 ? 6000 : 0; // 60 元（分）
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
      name: (customer?.name ?? null),
      // 寫入前就正規化電話，之後查詢更穩定
      phone: customer?.phone ? normalizePhone(customer.phone) : null,
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
    const row = db.prepare(`SELECT created_at FROM orders WHERE id = ?`).get(orderId);
    const orderNo = formatOrderNo(orderId, row.created_at);
    res.status(201).json({
      id: orderId,
      orderNo,
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

app.get('/api/orders/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: '訂單編號格式錯誤' });

  const getOrder = db.prepare(`
    SELECT id, created_at, subtotal_cents, shipping_cents, total_cents,
           customer_name, customer_phone, shipping_address
    FROM orders WHERE id = ?
  `);
  const order = getOrder.get(id);
  if (!order) return res.status(404).json({ error: '查無此訂單' });

  const getItems = db.prepare(`
    SELECT oi.product_id, oi.quantity, oi.unit_price_cents,
           p.name, p.image
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
    ORDER BY oi.id ASC
  `);
  const items = getItems.all(id).map(it => ({
    product_id: it.product_id, name: it.name, image: it.image, quantity: it.quantity,
    unit_price_cents: it.unit_price_cents, unitPriceText: priceToDisplay(it.unit_price_cents),
    line_cents: it.unit_price_cents * it.quantity, lineText: priceToDisplay(it.unit_price_cents * it.quantity)
  }));

  res.json({
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
  });
});

/** ✅ 查詢訂單（姓名驗證 + 訂單號或電話擇一） */
app.get('/api/orders/lookup', (req, res) => {
  const nameRaw = String(req.query.name || '');
  const orderNoRaw = (req.query.order_no ?? req.query.orderNo);
  const phoneRaw = String(req.query.phone || '');

  const name = nameRaw.trim();
  if (!name) return res.status(400).json({ error: '請提供姓名' });
  if (!orderNoRaw && !phoneRaw) return res.status(400).json({ error: '請提供訂單編號或電話其中一項' });

  // 以訂單編號查
  if (orderNoRaw) {
    const parsed = parseOrderNo(orderNoRaw);
    if (!parsed) return res.status(400).json({ error: '訂單編號格式錯誤' });

    const getOrder = db.prepare(`
      SELECT id, created_at, subtotal_cents, shipping_cents, total_cents,
             customer_name, customer_phone, shipping_address
      FROM orders WHERE id = ?
    `);
    const order = getOrder.get(parsed.id);
    if (!order) return res.status(404).json({ error: '查無此訂單' });

    const ymd = order.created_at.slice(0, 10).replace(/-/g, '');
    if (ymd !== parsed.ymd) return res.status(404).json({ error: '訂單編號不正確' });

    if ((order.customer_name || '').trim().toLowerCase() !== name.toLowerCase()) {
      return res.status(403).json({ error: '姓名不符' });
    }

    const getItems = db.prepare(`
      SELECT oi.product_id, oi.quantity, oi.unit_price_cents,
             p.name, p.image
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
    `);
    const items = getItems.all(order.id).map(it => ({
      product_id: it.product_id, name: it.name, image: it.image, quantity: it.quantity,
      unit_price_cents: it.unit_price_cents, unitPriceText: priceToDisplay(it.unit_price_cents),
      line_cents: it.unit_price_cents * it.quantity, lineText: priceToDisplay(it.unit_price_cents * it.quantity)
    }));

    return res.json({
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
    });
  }

  // 以電話 + 姓名查：回傳最新一筆（含正規化 + 寬鬆比對）
  const phone = normalizePhone(phoneRaw);

  const getLatestByPhone = db.prepare(`
    SELECT id, created_at, subtotal_cents, shipping_cents, total_cents,
           customer_name, customer_phone, shipping_address
    FROM orders
    WHERE TRIM(customer_name) = TRIM(@name) COLLATE NOCASE
      AND (
        customer_phone = @phone
        OR REPLACE(REPLACE(REPLACE(customer_phone,'-',''),' ',''),'+','') = @phone
        OR substr(REPLACE(REPLACE(REPLACE(customer_phone,'-',''),' ',''),'+',''), -10) = substr(@phone, -10)
      )
    ORDER BY datetime(created_at) DESC
    LIMIT 1
  `);

  const order = getLatestByPhone.get({ name, phone });
  if (!order) return res.status(404).json({ error: '查無符合條件的訂單' });

  const getItems = db.prepare(`
    SELECT oi.product_id, oi.quantity, oi.unit_price_cents,
           p.name, p.image
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
    ORDER BY oi.id ASC
  `);
  const items = getItems.all(order.id).map(it => ({
    product_id: it.product_id, name: it.name, image: it.image, quantity: it.quantity,
    unit_price_cents: it.unit_price_cents, unitPriceText: priceToDisplay(it.unit_price_cents),
    line_cents: it.unit_price_cents * it.quantity, lineText: priceToDisplay(it.unit_price_cents * it.quantity)
  }));

  res.json({
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
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ API listening on http://localhost:${PORT}`));
