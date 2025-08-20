import { db, initSchema, resetProducts } from './db.js';

// 從你的前端 allProducts 轉為數字價格（分）
const products = [
  { id: 1, name: '【現貨】抬頭星人光柵小卡六入組_老高與小茉', price: 250, category: '生活小物', image: 'https://cdn.cybassets.com/media/W1siZiIsIjE1NDA5L3Byb2R1Y3RzLzU2NDcxMDE2LzE3NTA4MDY0NjRfMmFjNjcyMDlkMzUzN2M1ZTllZGUucG5nIl0sWyJwIiwidGh1bWIiLCI2MDB4NjAwIl1d.png?sha=32b4907a7eb85024' },
  { id: 2, name: '【現貨】五歲抬頭手機掛繩-短-手腕繩_老高與小茉', price: 499, category: '手機配件', image: 'https://cdn.cybassets.com/media/W1siZiIsIjE1NDA5L3Byb2R1Y3RzLzQ1OTIyNjE4LzE3MTUwNjgzMzRfODUyZjExMGU2YzllNTNkZTliY2MuanBlZyJdLFsicCIsInRodW1iIiwiNjAweDYwMCJdXQ.jpeg?sha=7942df474aba424b' },
  { id: 3, name: '【現貨】五歲抬頭手機掛繩-長-頸掛繩_老高與小茉', price: 599, category: '手機配件', image: 'https://cdn.cybassets.com/media/W1siZiIsIjE1NDA5L3Byb2R1Y3RzLzQ2Mjg1NTkyLzE3MTUwNjgyOTlfNDA2ZGU2YmEyN2I5ZDljODJhMDYuanBlZyJdLFsicCIsInRodW1iIiwiNjAweDYwMCJdXQ.jpeg?sha=8775ac77da7250d3' },
  { id: 4, name: '【預購】老帽-5TITLE星球款_老高與小茉', price: 799, category: '服飾', image: 'https://cdn.cybassets.com/media/W1siZiIsIjE1NDA5L3Byb2R1Y3RzLzU1Mjg5NDgxLzE3NDYxOTQ0MzdfMjI4MTBkMWU0ZGMwZDE1MjE1YmYucG5nIl0sWyJwIiwidGh1bWIiLCI2MDB4NjAwIl1d.png?sha=7d3e1e9c5a64065b' },
  { id: 5, name: '【預購】辦公桌墊_老高與小茉', price: 850, category: '生活小物', image: 'https://cdn.cybassets.com/media/W1siZiIsIjE1NDA5L3Byb2R1Y3RzLzU1MjIxNjA2LzE3NTA1NzI2ODNfOTcyNDI2MGZjMTNlN2I4NzU1MTEucG5nIl0sWyJwIiwidGh1bWIiLCI2MDB4NjAwIl1d.png?sha=40bfafdad4a86e44' },
  { id: 6, name: '【預購】滑鼠墊_老高與小茉', price: 450, category: '生活小物', image: 'https://cdn.cybassets.com/media/W1siZiIsIjE1NDA5L3Byb2R1Y3RzLzU1MjIxNjA1LzE3NDY0NTAwOTVfNWRhNjBkOGEwMGI3YWY3NmZmYmIucG5nIl0sWyJwIiwidGh1bWIiLCI2MDB4NjAwIl1d.png?sha=e2417641666a968e' },
  { id: 7, name: '【現貨】五歲抬頭標語襪-2色_老高與小茉', price: 350, category: '服飾', image: 'https://cdn.cybassets.com/s/files/15409/theme/16999/assets/img/default_product.png' },
  { id: 8, name: '【現貨】五歲抬頭棒球帽-2色_老高與小茉', price: 799, category: '服飾', image: 'https://cdn.cybassets.com/s/files/15409/theme/16999/assets/img/default_product.png' },
  { id: 9, name: '【現貨】抬頭星人壓克力鑰匙圈-2款_老高與小茉', price: 250, category: '生活小物', image: 'https://cdn.cybassets.com/s/files/15409/theme/16999/assets/img/default_product.png' },
  { id: 10, name: '【現貨】抬頭星人貼紙組-3入_老高與小茉', price: 150, category: '生活小物', image: 'https://cdn.cybassets.com/s/files/15409/theme/16999/assets/img/default_product.png' },
  { id: 11, name: '【現貨】抬頭星人徽章組-3入_老高與小茉', price: 280, category: '生活小物', image: 'https://cdn.cybassets.com/s/files/15409/theme/16999/assets/img/default_product.png' },
  { id: 12, name: '【現貨】五歲抬頭漁夫帽_老高與小茉', price: 890, category: '服飾', image: 'https://cdn.cybassets.com/s/files/15409/theme/16999/assets/img/default_product.png' }
].map(p => ({ ...p, price_cents: Math.round(p.price * 100) }));

initSchema();
resetProducts(products.map(({ price, ...r }) => r));
console.log('✅ Seeded products into SQLite.');
process.exit(0);
