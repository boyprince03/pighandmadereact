// /frontend/src/components/admin/AdminProducts.jsx
import React, { useEffect, useRef, useState } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function AdminProducts({ onBack, onCreate, onEdit }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    const data = await fetch(`${API_BASE}/admin/products?limit=500`, { credentials: 'include' }).then(r => r.json());
    setRows(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r =>
    !q.trim() || r.name.toLowerCase().includes(q.toLowerCase()) || String(r.id).includes(q)
  );

  const onDelete = async (id) => {
    if (!confirm(`刪除商品 #${id}？`)) return;
    await fetch(`${API_BASE}/admin/products/${id}`, { method: 'DELETE', credentials: 'include' });
    await load();
  };

  const onUpload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return alert('請選擇檔案（.xlsx / .csv）');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_BASE}/admin/products/bulk`, { method:'POST', body: fd, credentials:'include' });
    if (!res.ok) {
      const j = await res.json().catch(()=>({}));
      alert(j.error || '上傳失敗');
      return;
    }
    alert('上傳完成');
    fileRef.current.value = '';
    await load();
  };

  return (
    <div className="bg-gray-50 min-h-[60vh]">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="px-3 py-2 text-sm rounded-md border">← 返回面板</button>
            <h1 className="text-2xl font-bold">商品管理</h1>
          </div>
          <button onClick={onCreate} className="px-3 py-2 text-sm rounded-md border hover:bg-white">新增商品</button>
        </div>

        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <form onSubmit={onUpload} className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="text-sm text-gray-700">
              Excel 批量上傳（支援 .xlsx / .csv；欄位：id, name, price 或 price_cents, category, image）
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.csv" className="border rounded px-2 py-1"/>
            <button className="px-3 py-2 text-sm rounded-md border hover:bg-gray-50">上傳</button>
            <a
              className="text-sm underline"
              href="data:text/csv;charset=utf-8,id,name,price,category,image%0A101,範例商品,199,生活小物,https://picsum.photos/seed/101/300%0A"
              download="products_template.csv"
            >
              下載CSV範本
            </a>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow">
          <div className="p-4 flex items-center justify-between">
            <input
              className="border rounded px-3 py-2 text-sm w-64"
              placeholder="搜尋商品名稱或ID…"
              value={q}
              onChange={e=>setQ(e.target.value)}
            />
            <div className="text-sm text-gray-500">共 {filtered.length} 筆</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">名稱</th>
                  <th className="px-4 py-2">分類</th>
                  <th className="px-4 py-2">價格</th>
                  <th className="px-4 py-2">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td className="px-4 py-6" colSpan={5}>載入中…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td className="px-4 py-6" colSpan={5}>無資料</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id}>
                    <td className="px-4 py-2">{p.id}</td>
                    <td className="px-4 py-2">{p.name}</td>
                    <td className="px-4 py-2">{p.category}</td>
                    <td className="px-4 py-2">{p.priceText}</td>
                    <td className="px-4 py-2 space-x-2">
                      <button onClick={()=>onEdit(p.id)} className="px-2 py-1 border rounded hover:bg-gray-50">編輯</button>
                      <button onClick={()=>onDelete(p.id)} className="px-2 py-1 border rounded hover:bg-gray-50">刪除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
