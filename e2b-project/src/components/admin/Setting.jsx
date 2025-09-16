import React, { useEffect, useState } from 'react';
import { FaLine, FaInstagram, FaEnvelope, FaFacebook } from 'react-icons/fa';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// 定義連結名稱與圖示的對應關係
const linkIcons = {
  Line: FaLine,
  Instagram: FaInstagram,
  Email: FaEnvelope,
  Facebook: FaFacebook,
};

export default function Setting({ onBack }) {
  const [form, setForm] = useState({
    site_title: '',
    footer_notes: [],
    footer_links: [
      { name: 'Line', href: '' },
      { name: 'Instagram', href: '' },
      { name: 'Email', href: '' },
      { name: 'Facebook', href: '' },
    ],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings`);
      if (!res.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await res.json();
      setForm((prevForm) => ({
        ...data,
        footer_links: [
          { name: 'Line', href: data.footer_links.find((l) => l.name === 'Line')?.href || '' },
          { name: 'Instagram', href: data.footer_links.find((l) => l.name === 'Instagram')?.href || '' },
          { name: 'Email', href: data.footer_links.find((l) => l.name === 'Email')?.href || '' },
          { name: 'Facebook', href: data.footer_links.find((l) => l.name === 'Facebook')?.href || '' },
          ...data.footer_links.filter(
            (l) => !['Line', 'Instagram', 'Email', 'Facebook'].includes(l.name)
          ),
        ],
      }));
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        alert('已儲存');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('儲存失敗，請重試。');
    } finally {
      setSaving(false);
    }
  };

  // 判斷是否為預設的四種連結
  const isDefaultLink = (name) => ['Line', 'Instagram', 'Email', 'Facebook'].includes(name);

  return (
    <div className="p-6">
      <button onClick={onBack} className="px-3 py-2 border rounded">
        ← 返回
      </button>
      <h1 className="text-2xl font-bold mb-4">網站設定</h1>

      {loading ? (
        '載入中…'
      ) : (
        <div className="space-y-6">
          <div>
            <label className="block text-sm mb-1">網站標題</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.site_title}
              onChange={(e) => setForm((f) => ({ ...f, site_title: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">注意事項</label>
            {form.footer_notes.map((n, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  className="flex-1 border rounded px-2"
                  value={n}
                  onChange={(e) => {
                    const arr = [...form.footer_notes];
                    arr[i] = e.target.value;
                    setForm((f) => ({ ...f, footer_notes: arr }));
                  }}
                />
                <button
                  onClick={() => {
                    setForm((f) => ({
                      ...f,
                      footer_notes: f.footer_notes.filter((_, j) => j !== i),
                    }));
                  }}
                >
                  刪除
                </button>
              </div>
            ))}
            <button onClick={() => setForm((f) => ({ ...f, footer_notes: [...f.footer_notes, ''] }))}>
              ＋新增
            </button>
          </div>

          <div>
            <label className="block text-sm mb-1">相關連結</label>
            {form.footer_links.map((l, i) => {
              const IconComponent = linkIcons[l.name]; // 取得對應的圖示元件
              return (
                <div key={i} className="flex gap-2 mb-2 items-center">
                  {IconComponent && <IconComponent className="text-xl" />}
                  <input
                    className="flex-1 border rounded px-2"
                    placeholder="名稱"
                    value={l.name}
                    onChange={(e) => {
                      const arr = [...form.footer_links];
                      arr[i] = { ...arr[i], name: e.target.value };
                      setForm((f) => ({ ...f, footer_links: arr }));
                    }}
                    disabled={isDefaultLink(l.name)} // 預設連結名稱不可修改
                  />
                  <input
                    className="flex-1 border rounded px-2"
                    placeholder="URL"
                    value={l.href}
                    onChange={(e) => {
                      const arr = [...form.footer_links];
                      arr[i] = { ...arr[i], href: e.target.value };
                      setForm((f) => ({ ...f, footer_links: arr }));
                    }}
                  />
                  <button
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        footer_links: f.footer_links.filter((_, j) => j !== i),
                      }));
                    }}
                    disabled={isDefaultLink(l.name)} // 預設連結不可刪除
                  >
                    刪除
                  </button>
                </div>
              );
            })}
            <button
              onClick={() => setForm((f) => ({ ...f, footer_links: [...f.footer_links, { name: '', href: '' }] }))}
            >
              ＋新增
            </button>
          </div>

          <div>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-gray-900 text-white rounded"
            >
              {saving ? '儲存中…' : '💾 儲存'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}