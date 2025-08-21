// /frontend/src/components/admin/AdminProductForm.jsx
import React, { useEffect, useRef, useState } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function AdminProductForm({ productId, onBack }) {
  const isNew = String(productId) === 'new';
  const [form, setForm] = useState({ id:'', name:'', category:'', price:'', image:'' });
  const [loading, setLoading] = useState(!isNew);

  // 上傳相關狀態
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState(''); // 本地選檔即時縮圖
  const fileRef = useRef(null);

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

  // 本地選檔變更
  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    setLocalPreview('');
    if (!f) return;
    const url = URL.createObjectURL(f);
    setLocalPreview(url);
  };

  // 上傳圖片到後端（★ 成功後自動寫回 DB：編輯模式）
  const onUploadImage = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return alert('請先選擇圖片檔案');
    if (!/^image\//.test(file.type)) return alert('請選擇圖片檔（jpg、png、webp…）');

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`${API_BASE}/admin/upload`, {
        method: 'POST',
        credentials: 'include',
        body: fd
      });
      if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        throw new Error(j.error || '上傳失敗');
      }
      const data = await res.json();              // { url, filename }
      setForm(f => ({ ...f, image: data.url }));  // 先更新表單顯示
      setLocalPreview('');
      if (fileRef.current) fileRef.current.value = '';

      // ★★★ 新增：若為編輯模式，立刻寫回資料庫（PUT）
      if (!isNew) {
        const putPayload = {
          name: form.name,
          category: form.category,
          price: Number(form.price) || 0,
          image: data.url
        };
        const saveRes = await fetch(`${API_BASE}/admin/products/${productId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(putPayload)
        });
        if (!saveRes.ok) {
          const j = await saveRes.json().catch(()=>({}));
          throw new Error(j.error || '圖片已上傳，但寫入資料庫失敗（請手動按「儲存」）');
        }
        alert('圖片已上傳並寫入資料庫');
      } else {
        // 新增模式還沒有正式建檔，僅先更新畫面上的 URL；完成其他欄位後按「儲存」即可入庫
        alert('圖片已上傳（新增商品需按「儲存」才會寫入資料庫）');
      }
    } catch (e) {
      console.error(e);
      alert(e.message || '上傳失敗');
    } finally {
      setUploading(false);
    }
  };

  // 清除圖片
  const clearImage = () => {
    setForm(f => ({ ...f, image: '' }));
    setLocalPreview('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const previewSrc = localPreview || form.image;

  return (
    <div className="bg-gray-50 min-h-[60vh]">
      <div className="max-w-5xl mx-auto p-6">
        {/* 頁首：返回 + 標題 */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={onBack} className="px-3 py-2 text-sm rounded-md border">← 返回商品</button>
          <h1 className="text-2xl font-bold">{isNew ? '新增商品' : `編輯商品 #${productId}`}</h1>
        </div>

        {/* 版面：左側縮圖（卡片外）、右側表單卡片 */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* 左側縮圖區（卡片外、sticky） */}
          <aside className="md:w-64 w-full">
            <div className="sticky top-6">
              <div className="text-sm text-gray-600 mb-2">縮圖預覽</div>
              <div className="w-full aspect-square border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center shadow-sm">
                {previewSrc ? (
                  <img src={previewSrc} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-400">無圖片</span>
                )}
              </div>
            </div>
          </aside>

          {/* 右側表單卡片 */}
          <section className="flex-1">
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

                {/* 圖片輸入與上傳（預覽在左側） */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">圖片 URL（可直接貼網址）</label>
                    <input
                      className="w-full border rounded px-3 py-2"
                      placeholder="https://…（或先下方上傳圖片）"
                      value={form.image}
                      onChange={e=>setForm(f=>({...f, image:e.target.value}))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">或上傳圖片檔</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="border rounded px-2 py-1"
                        onChange={onPickFile}
                      />
                      <button
                        type="button"
                        onClick={onUploadImage}
                        disabled={uploading}
                        className="px-3 py-2 text-sm rounded-md border hover:bg-gray-50 disabled:opacity-50"
                      >
                        {uploading ? '上傳中…' : '上傳圖片'}
                      </button>
                      <button
                        type="button"
                        onClick={clearImage}
                        className="px-3 py-2 text-sm rounded-md border hover:bg-gray-50"
                      >
                        清除圖片
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">支援 JPG/PNG/WebP，大小 ≤ 5 MB。</p>
                  </div>
                </div>

                <div className="pt-2">
                  <button className="px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-black">儲存</button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
