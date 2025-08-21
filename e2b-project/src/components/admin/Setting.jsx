// /frontend/src/components/admin/Setting.jsx
import React, { useEffect, useState } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function Setting({ onBack }) {
  const [form, setForm] = useState({ site_title: '', footer_notes: [], footer_links: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`${API_BASE}/settings`);
    const data = await res.json();
    setForm(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    await fetch(`${API_BASE}/admin/settings`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(form)
    });
    alert('已儲存');
    setSaving(false);
  };

  return (
    <div className="p-6">
      <button onClick={onBack} className="px-3 py-2 border rounded">← 返回</button>
      <h1 className="text-2xl font-bold mb-4">網站設定</h1>

      {loading ? "載入中…" : (
        <div className="space-y-6">
          <div>
            <label className="block text-sm mb-1">網站標題</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.site_title}
              onChange={e=>setForm(f=>({...f, site_title: e.target.value}))}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">注意事項</label>
            {form.footer_notes.map((n,i)=>(
              <div key={i} className="flex gap-2 mb-2">
                <input className="flex-1 border rounded px-2"
                       value={n}
                       onChange={e=>{
                         const arr=[...form.footer_notes]; arr[i]=e.target.value;
                         setForm(f=>({...f, footer_notes:arr}));
                       }}/>
                <button onClick={()=>{
                  setForm(f=>({...f, footer_notes:f.footer_notes.filter((_,j)=>j!==i)}));
                }}>刪除</button>
              </div>
            ))}
            <button onClick={()=>setForm(f=>({...f, footer_notes:[...f.footer_notes,'']}))}>＋新增</button>
          </div>

          <div>
            <label className="block text-sm mb-1">相關連結</label>
            {form.footer_links.map((l,i)=>(
              <div key={i} className="flex gap-2 mb-2">
                <input className="flex-1 border rounded px-2"
                       placeholder="名稱"
                       value={l.name}
                       onChange={e=>{
                         const arr=[...form.footer_links]; arr[i]={...arr[i],name:e.target.value};
                         setForm(f=>({...f, footer_links:arr}));
                       }}/>
                <input className="flex-1 border rounded px-2"
                       placeholder="URL"
                       value={l.href}
                       onChange={e=>{
                         const arr=[...form.footer_links]; arr[i]={...arr[i],href:e.target.value};
                         setForm(f=>({...f, footer_links:arr}));
                       }}/>
                <button onClick={()=>{
                  setForm(f=>({...f, footer_links:f.footer_links.filter((_,j)=>j!==i)}));
                }}>刪除</button>
              </div>
            ))}
            <button onClick={()=>setForm(f=>({...f, footer_links:[...f.footer_links,{name:'',href:''}]}))}>＋新增</button>
          </div>

          <div>
            <button onClick={save} disabled={saving}
              className="px-4 py-2 bg-gray-900 text-white rounded">{saving?'儲存中…':'💾 儲存'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
