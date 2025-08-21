// /frontend/src/components/OrderLookup.jsx
import React, { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// 全形數字/符號 -> 半形
function toHalfWidthAll(s) {
  return String(s ?? '')
    .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)) // ０-９ -> 0-9
    .replace(/[／]/g, '/')  // 全形斜線 -> /
    .replace(/[﹣－—–‒―～〜]/g, '-'); // 各式破折號/波浪線 -> -
}

export default function OrderLookup({ setView }) {
  const [orderKey, setOrderKey] = useState(''); // 可輸入「ID」或「訂單編號」
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState('');

  const onSearch = async (e) => {
    e?.preventDefault?.();
    setErr('');
    setOrder(null);

    let raw = String(orderKey || '').trim();
    if (!raw) {
      setErr('請輸入訂單編號或ID');
      return;
    }

    const normalized = toHalfWidthAll(raw);
    const isPureId = /^\d+$/.test(normalized);

    const url = isPureId
      ? `${API_BASE}/orders/${encodeURIComponent(normalized)}`
      : `${API_BASE}/orders/lookup?order_no=${encodeURIComponent(normalized)}`;

    setLoading(true);
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || '查無此訂單');
      }
      const data = await res.json();
      setOrder(data);
    } catch (e) {
      setErr(e.message || '查詢失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-[60vh]">
      <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">查詢訂單</h1>
          <div className="space-x-2">
            <button onClick={() => setView('products')} className="text-sm px-3 py-2 rounded-md border">
              ← 返回商品
            </button>
            <button onClick={() => setView('checkout')} className="text-sm px-3 py-2 rounded-md border">
              前往購物車
            </button>
          </div>
        </div>

        <form onSubmit={onSearch} className="bg-white p-4 rounded-xl shadow flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            inputMode="text"
            placeholder="輸入訂單編號（例：20250821-0001、2025/08/21-1）或純數字ID"
            className="flex-1 border rounded-md px-3 py-2"
            value={orderKey}
            onChange={(e) => setOrderKey(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-md text-white bg-gray-900 hover:bg-black disabled:bg-gray-300"
          >
            {loading ? '查詢中…' : '查詢'}
          </button>
        </form>

        {err && (
          <div className="mt-4 p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
            {err}
          </div>
        )}

        {order && (
          <div className="mt-8 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h2 className="text-lg font-semibold">
                  #訂單編號：{order.orderNo ? order.orderNo : `#${order.id}`}
                </h2>
                <p className="text-sm text-gray-500">建立時間：{order.created_at}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">收件資訊</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>姓名：{order.customer?.name || '—'}</li>
                    <li>電話：{order.customer?.phone || '—'}</li>
                    <li>地址：{order.customer?.address || '—'}</li>
                  </ul>
                </div>

                <div className="md:col-span-2">
                  <h3 className="font-medium text-gray-900 mb-2">金額</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="p-3 rounded-md bg-gray-50">
                      <div className="text-gray-500">小計</div>
                      <div className="font-semibold">{order.subtotalText}</div>
                    </div>
                    <div className="p-3 rounded-md bg-gray-50">
                      <div className="text-gray-500">運費</div>
                      <div className="font-semibold">{order.shippingText}</div>
                    </div>
                    <div className="p-3 rounded-md bg-gray-50">
                      <div className="text-gray-500">總計</div>
                      <div className="font-semibold">{order.totalText}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="font-medium text-gray-900 mb-4">商品項目</h3>
              <ul className="divide-y">
                {order.items.map((it, idx) => (
                  <li key={`${it.product_id}-${idx}`} className="py-4 flex gap-4 items-center">
                    <img src={it.image} alt={it.name} className="w-16 h-16 rounded-md object-cover" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{it.name}</div>
                      <div className="text-sm text-gray-500">單價：{it.unitPriceText} × 數量：{it.quantity}</div>
                    </div>
                    <div className="text-right font-semibold">{it.lineText}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setView('products')} className="px-4 py-2 rounded-md border">
                繼續逛逛
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
