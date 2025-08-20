import React, { useEffect, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function LoginRegister({ onClose, onAuthed }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const googleDivRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const w = window;
    if (!w.google || !googleDivRef.current) return;

    try {
      w.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const res = await fetch(`${API_BASE}/auth/google`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ idToken: response.credential })
            });
            if (!res.ok) throw new Error('Google 登入失敗');
            const user = await res.json();
            onAuthed?.(user);
          } catch (e) {
            alert(e.message || 'Google 登入失敗');
          }
        }
      });

      w.google.accounts.id.renderButton(googleDivRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        width: '100'
      });
    } catch (e) {
      console.warn('Google button render failed', e);
    }
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = tab === 'login' ? `${API_BASE}/auth/login` : `${API_BASE}/auth/register`;
      const payload = tab === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '操作失敗');
      }
      const user = await res.json();
      onAuthed?.(user);
    } catch (err) {
      alert(err.message || '操作失敗');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">登入 / 註冊</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900">✕</button>
        </div>

        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-2 rounded-lg text-sm ${tab === 'login' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            登入
          </button>
          <button
            onClick={() => setTab('register')}
            className={`flex-1 py-2 rounded-lg text-sm ${tab === 'register' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            註冊
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {tab === 'register' && (
            <input
              className="w-full border rounded-md p-2"
              placeholder="姓名"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            />
          )}
          <input
            className="w-full border rounded-md p-2"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
          />
          <input
            className="w-full border rounded-md p-2"
            placeholder="密碼"
            type="password"
            value={form.password}
            onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
          />

          <button
            type="submit"
            className="w-full bg-gray-900 text-white rounded-md py-2 hover:bg-black"
          >
            {tab === 'login' ? '登入' : '建立帳號'}
          </button>
        </form>

        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">或使用 Google</span>
            </div>
          </div>

          {GOOGLE_CLIENT_ID ? (
            <div ref={googleDivRef} className="mt-4 flex justify-center" />
          ) : (
            <p className="mt-4 text-center text-xs text-gray-500">
              尚未設定 <code>VITE_GOOGLE_CLIENT_ID</code>，故隱藏 Google 登入按鈕。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
