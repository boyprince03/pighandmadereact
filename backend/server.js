import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { db, initSchema } from './db.js';

initSchema();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const TWD = new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD' });
const priceToDisplay = cents => TWD.format(cents / 100);

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// 產品列表（支援 ?category=服飾 & ?q=關鍵字）
app.get('/api/products', (req, res) => {
  const { category, q } = req.query;
  let sql = `SELECT id, name, price_cents, category, image FROM products`;
  const where = [];
  const params = {};

  if (category && category !== 'all') {
    where.push(`category = @category`);
    params.category = category;
  }
  if (q && q.trim()) {
    where.push(`LOWER(name) LIKE '%' || LOWER(@q) || '%'`);
    params.q = q.trim();
  }
  if (where.length) sql += ` WHERE ` + where.join(' AND ');
  sql += ` ORDER BY id ASC`;

  const rows = db.prepare(sql).all(params);
  res.json(rows.map(r => ({
    ...r,
    price: r.price_cents / 100,
    priceText: priceToDisplay(r.price_cents)
  })));
});

// 單筆產品
app.get('/api/products/:id', (req, res) => {
  const row = db.prepare(
    `SELECT id, name, price_cents, category, image FROM products WHERE id = ?`
  ).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ...row, price: row.price_cents / 100, priceText: priceToDisplay(row.price_cents) });
});

// 建立訂單（接收 cart items）
/*
  payload:
  {
    customer: { name, phone, address },
    items: [{ productId, quantity }]
  }
*/
app.post('/api/orders', (req, res) => {
  const { customer, items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  // 讀價格、計小計
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

  const shipping = items.length > 0 ? 6000 : 0; // 60元（以分）
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
      subtotal,
      shipping,
      total,
      name: customer?.name || null,
      phone: customer?.phone || null,
      addr: customer?.address || null
    });
    const orderId = info.lastInsertRowid;
    expand.forEach(({ product, qty }) => {
      insertItem.run({
        orderId,
        productId: product.id,
        qty,
        unit: product.price_cents
      });
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ API listening on http://localhost:${PORT}`));
