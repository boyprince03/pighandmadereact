// /frontend/src/components/admin/AdminOrderDetail.jsx
import React, { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const TWD = new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD' });

export default function AdminOrderDetail({ orderId, onBack }) {
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('pending');
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const allowedStatuses = useMemo(() => ([
    { value: 'pending', label: 'pending（待處理）' },
    { value: 'paid', label: 'paid（已付款）' },
    { value: 'shipped', label: 'shipped（已出貨）' },
    { value: 'canceled', label: 'canceled（已取消）' },
  ]), []);

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}`, { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      const o = await res.json();
      setOrder(o);
      setStatus(o.status);
      setCustomer({
        name: o.customer?.name || '',
        phone: o.customer?.phone || '',
        address: o.customer?.address || '',
      });
    } catch (e) {
      console.error(e);
      setErr('讀取失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orderId]);

  const onSave = async () => {
    setSaving(true);
    setErr('');
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, customer }),
      });
      if (!res.ok) throw new Error(await res.text());
      const o = await res.json();
      setOrder(o);
    } catch (e) {
      console.error(e);
      setErr('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!confirm(`確定要刪除訂單 #${orderId} 嗎？`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      alert('已刪除');
      onBack?.();
    } catch (e) {
      console.error(e);
      alert('刪除失敗');
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <button onClick={onBack} className="mb-4 px-3 py-2 border rounded hover:bg-gray-50">← 返回</button>
        <div>載入中…</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-4">
        <button onClick={onBack} className="mb-4 px-3 py-2 border rounded hover:bg-gray-50">← 返回</button>
        <div className="text-red-600">{err || '查無此訂單'}</div>
      </div>
    );
  }

  const totals = [
    { k: '小計', v: order.subtotalText || TWD.format(order.subtotal_cents / 100) },
    { k: '運費', v: order.shippingText || TWD.format(order.shipping_cents / 100) },
    { k: '總計', v: order.totalText || TWD.format(order.total_cents / 100) },
  ];

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="space-x-2">
          <button onClick={onBack} className="px-3 py-2 border rounded hover:bg-gray-50">← 返回</button>
          <button onClick={load} className="px-3 py-2 border rounded hover:bg-gray-50">重新整理</button>
        </div>
        <div className="space-x-2">
          <button onClick={onSave} disabled={saving} className="px-3 py-2 border rounded hover:bg-gray-50 disabled:opacity-50">
            {saving ? '儲存中…' : '💾 儲存'}
          </button>
          <button onClick={onDelete} className="px-3 py-2 border rounded text-red-600 hover:bg-red-50">🗑 刪除</button>
        </div>
      </div>

      {err && <div className="mb-4 text-red-600">{err}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：訂單基本資訊 + 收件資訊 + 狀態 */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-lg font-semibold mb-2">訂單資訊</div>
            <div className="text-sm text-gray-600">訂單編號</div>
            <div className="mb-2 font-mono">{order.orderNo || `#${order.id}`}</div>
            <div className="text-sm text-gray-600">建立時間</div>
            <div className="mb-2">{order.created_at}</div>
            <div className="text-sm text-gray-600">狀態</div>
            <div className="mt-1">
              <select
                className="w-full border rounded px-3 py-2"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {allowedStatuses.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-lg font-semibold mb-2">收件資訊</div>

            <label className="block text-sm text-gray-600 mb-1">姓名</label>
            <input
              className="w-full border rounded px-3 py-2 mb-3"
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              placeholder="收件人姓名"
            />

            <label className="block text-sm text-gray-600 mb-1">電話</label>
            <input
              className="w-full border rounded px-3 py-2 mb-3"
              value={customer.phone}
              onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              placeholder="聯絡電話"
            />

            <label className="block text-sm text-gray-600 mb-1">地址</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              rows={3}
              value={customer.address}
              onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
              placeholder="寄送地址"
            />
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-lg font-semibold mb-2">金額</div>
            <ul className="text-sm">
              {totals.map((t, i) => (
                <li key={i} className="flex justify-between py-1">
                  <span className={i === totals.length - 1 ? 'font-semibold' : ''}>{t.k}</span>
                  <span className={i === totals.length - 1 ? 'font-semibold' : ''}>{t.v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 右側：明細 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-lg font-semibold mb-3">商品明細</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b bg-gray-50">
                    <th className="px-3 py-2">商品</th>
                    <th className="px-3 py-2">單價</th>
                    <th className="px-3 py-2">數量</th>
                    <th className="px-3 py-2">小計</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.length ? order.items.map((it, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-3">
                          {it.image ? (
                            <img src={it.image} alt={it.name} className="w-12 h-12 rounded object-cover border" />
                          ) : (
                            <div className="w-12 h-12 rounded bg-gray-100 border" />
                          )}
                          <div>
                            <div className="font-medium">{it.name}</div>
                            <div className="text-xs text-gray-500">#{it.product_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">{it.unitPriceText || TWD.format((it.unit_price_cents || 0) / 100)}</td>
                      <td className="px-3 py-2">{it.quantity}</td>
                      <td className="px-3 py-2">{it.lineText || TWD.format(((it.unit_price_cents || 0) * (it.quantity || 0)) / 100)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>— 無明細 —</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              建立時間：{order.created_at}　|　目前狀態：<span className="font-medium">{status}</span>　|　訂單 ID：#{order.id}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
