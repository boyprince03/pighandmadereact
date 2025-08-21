// /frontend/src/components/admin/AdminDashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

function MiniBarChart({ title, data = [], valueKey = 'value', labelKey = 'label' }) {
  const max = Math.max(1, ...data.map(d => Number(d[valueKey] || 0)));
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-sm text-gray-600 mb-2">{title}</div>
      <div className="h-40 flex items-end gap-2">
        {data.map((d, i) => {
          const h = Math.round((Number(d[valueKey] || 0) / max) * 100);
          return (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className="w-full bg-gray-100 rounded">
                <div className="w-full rounded bg-gray-900" style={{ height: `${h}%` }} />
              </div>
              <div className="text-[10px] text-gray-500 mt-1 truncate w-full text-center">{d[labelKey]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminDashboard({ onGoProducts, onGoOrders, onOpenOrder, onOpenProduct }) {
  const [sum, setSum] = useState(null);
  const [monthly, setMonthly] = useState([]);

  useEffect(() => {
    (async () => {
      const s = await fetch(`${API_BASE}/admin/summary`, { credentials: 'include' }).then(r => r.json());
      const m = await fetch(`${API_BASE}/admin/metrics/monthly`, { credentials: 'include' }).then(r => r.json());
      setSum(s);
      setMonthly(m);
    })();
  }, []);

  const barOrders = useMemo(() => monthly.map(r => ({ label: r.ym.slice(5), value: r.orders_count })), [monthly]);
  const barRevenue = useMemo(() => monthly.map(r => ({ label: r.ym.slice(5), value: (r.revenue_cents || 0)/100 })), [monthly]);

  return (
    <div className="bg-gray-50 min-h-[60vh]">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">管理面板</h1>
          <div className="space-x-2">
            <a
              className="px-3 py-2 text-sm rounded-md border hover:bg-white"
              href={`${API_BASE}/admin/reports/monthly.xlsx`} target="_blank" rel="noreferrer"
            >
              下載報表（.xlsx）
            </a>
          </div>
        </div>

        {/* 圖表區 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <MiniBarChart title="月訂單數 (近12個月)" data={barOrders} />
          <MiniBarChart title="月營收TWD (近12個月)" data={barRevenue} />
        </div>

        {/* 最新待處理訂單 + 熱銷商品 + 最新商品 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 待處理訂單 */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">待處理訂單（最新 5 筆）</h2>
              <button onClick={onGoOrders} className="text-sm text-gray-600 hover:text-gray-900">查看全部 →</button>
            </div>
            <ul className="divide-y">
              {sum?.latestPending?.map(o => (
                <li key={o.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">#{o.id}・{o.totalText}</div>
                    <div className="text-xs text-gray-500">{o.created_at}</div>
                  </div>
                  <button onClick={() => onOpenOrder(o.id)} className="text-sm px-2 py-1 border rounded hover:bg-gray-50">管理</button>
                </li>
              )) || <div className="text-sm text-gray-500 py-3">—</div>}
            </ul>
          </div>

          {/* 熱銷商品 */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">熱銷商品（近30天 Top 5）</h2>
              <button onClick={onGoProducts} className="text-sm text-gray-600 hover:text-gray-900">商品管理 →</button>
            </div>
            <ul className="divide-y">
              {sum?.topProducts30d?.map(p => (
                <li key={p.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">銷量 {p.qty} ・ {p.revText}</div>
                  </div>
                  <button onClick={() => onOpenProduct(p.id)} className="text-sm px-2 py-1 border rounded hover:bg-gray-50">編輯</button>
                </li>
              )) || <div className="text-sm text-gray-500 py-3">—</div>}
            </ul>
          </div>

          {/* 最新商品 */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">最新商品（5筆）</h2>
              <button onClick={onGoProducts} className="text-sm text-gray-600 hover:text-gray-900">商品管理 →</button>
            </div>
            <ul className="divide-y">
              {sum?.latestProducts?.map(p => (
                <li key={p.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">#{p.id}・{p.priceText}・{p.category}</div>
                  </div>
                  <button onClick={() => onOpenProduct(p.id)} className="text-sm px-2 py-1 border rounded hover:bg-gray-50">編輯</button>
                </li>
              )) || <div className="text-sm text-gray-500 py-3">—</div>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
