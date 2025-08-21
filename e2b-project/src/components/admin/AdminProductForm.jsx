// /frontend/src/components/admin/AdminProductForm.jsx
import React, { useEffect, useState } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function AdminProductForm({ productId, onBack }) {
  const isNew = String(productId) === 'new';
  const [form, setForm] = useState({ id:'', name:'', category:'', price:'', image:'' });
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      setLoading(true);
      const p = await fetch(`${API_BASE}/admin/products/${productId}`, { credentials:'include' }).then(r=>r.json());
      setForm({
        id: p.id,
        name: p.name || '',
        category: p.category || '',
        price: p.price ?? (p.price_cents/100),
        image: p.image || ''
      });
      setLoading(false);
    })();
  }, [productId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      id: form.id ? Number(form.id) : undefined,
      name: form.name,
      category: form.category,
      price: Number(form.price),
      image: form.image || null
    };
    const url = isNew ? `${API_BASE}/admin/products` : `${API_BASE}/admin/products/${productId}`;
    const method = isNew ? 'POST' : 'PUT';
    const res = await fetch(url, {
      method, credentials:'include',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const j = await res.json().catch(()=>({}));
      alert(j.error || '儲存失敗');
      return;
    }
    alert('已儲存');
    onBack();
  };

  return (
    <div className="bg-gray-50 min-h-[60vh]">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={onBack} className="px-3 py-2 text-sm rounded-md border">← 返回商品</button>
          <h1 className="text-2xl font-bold">{isNew ? '新增商品' : `編輯商品 #${productId}`}</h1>
        </div>

        {loading ? (
          <div className="bg-white p-6 rounded-xl shadow">載入中…</div>
        ) : (
          <form onSubmit={onSubmit} className="bg-white p-6 rounded-xl shadow space-y-4">
            {!isNew && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">ID（唯讀）</label>
                <input className="w-full border rounded px-3 py-2 bg-gray-50" value={form.id} disabled />
              </div>
            )}
            {isNew && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">ID（可留空自動編號）</label>
                <input className="w-full border rounded px-3 py-2" value={form.id} onChange={e=>setForm(f=>({...f, id:e.target.value}))}/>
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-600 mb-1">名稱</label>
              <input className="w-full border rounded px-3 py-2" required
                     value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))}/>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">分類</label>
              <input className="w-full border rounded px-3 py-2" required
                     value={form.category} onChange={e=>setForm(f=>({...f, category:e.target.value}))}/>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">價格（TWD）</label>
              <input type="number" min="0" step="0.01" className="w-full border rounded px-3 py-2" required
                     value={form.price} onChange={e=>setForm(f=>({...f, price:e.target.value}))}/>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">圖片 URL</label>
              <input className="w-full border rounded px-3 py-2"
                     value={form.image} onChange={e=>setForm(f=>({...f, image:e.target.value}))}/>
            </div>

            <div className="pt-2">
              <button className="px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-black">儲存</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
