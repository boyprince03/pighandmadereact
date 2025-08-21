// /frontend/src/components/admin/AdminOrders.jsx
import React, { useEffect, useState } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function AdminOrders({ onBack, onOpen }) {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const url = new URL(`${API_BASE}/admin/orders`, location.origin);
    if (status !== 'all') url.searchParams.set('status', status);
    url.searchParams.set('limit', '500');
    const data = await fetch(url.toString().replace(location.origin, ''), { credentials:'include' }).then(r=>r.json());
    setRows(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, [status]);

  const filtered = rows.filter(r =>
    !q.trim() || String(r.id).includes(q) || (r.customer_name||'').toLowerCase().includes(q.toLowerCase())
  );

  const onDelete = async (id) => {
    if (!confirm(`刪除訂單 #${id}？`)) return;
    await fetch(`${API_BASE}/admin/orders/${id}`, { method:'DELETE', credentials:'include' });
    await load();
  };

  return (
    <div className="bg-gray-50 min-h-[60vh]">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="px-3 py-2 text-sm rounded-md border">← 返回面板</button>
            <h1 className="text-2xl font-bold">訂單管理</h1>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm">狀態</label>
            <select className="border rounded px-2 py-1 text-sm" value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="all">全部</option>
              <option value="pending">待處理</option>
              <option value="paid">已付款</option>
              <option value="shipped">已出貨</option>
              <option value="canceled">已取消</option>
            </select>
          </div>
          <input
            className="border rounded px-3 py-2 text-sm w-64"
            placeholder="搜尋訂單ID或姓名…"
            value={q}
            onChange={e=>setQ(e.target.value)}
          />
          <div className="text-sm text-gray-500">共 {filtered.length} 筆</div>
        </div>

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">建立時間</th>
                <th className="px-4 py-2">客戶</th>
                <th className="px-4 py-2">金額</th>
                <th className="px-4 py-2">狀態</th>
                <th className="px-4 py-2">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td className="px-4 py-6" colSpan={6}>載入中…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="px-4 py-6" colSpan={6}>無資料</td></tr>
              ) : filtered.map(o => (
                <tr key={o.id}>
                  <td className="px-4 py-2">{o.id}</td>
                  <td className="px-4 py-2">{o.created_at}</td>
                  <td className="px-4 py-2">{o.customer_name || '—'}</td>
                  <td className="px-4 py-2">{o.totalText}</td>
                  <td className="px-4 py-2">{o.status}</td>
                  <td className="px-4 py-2 space-x-2">
                    <button onClick={()=>onOpen(o.id)} className="px-2 py-1 border rounded hover:bg-gray-50">查看/編輯</button>
                    <button onClick={()=>onDelete(o.id)} className="px-2 py-1 border rounded hover:bg-gray-50">刪除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
