import React, { useEffect, useMemo, useState } from 'react';
import RechartsBarChart from './RechartsBarChart';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// 產生近 12 個月 yyyy-mm 陣列（含當月）
function last12MonthsKeys() {
  const arr = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    arr.push(`${y}-${m}`);
  }
  return arr;
}

// 將後端回傳補齊為 12 個月（沒有的月份用 0）
function padMonthly(rows) {
  const map = new Map(rows.map(r => [r.ym, r]));
  return last12MonthsKeys().map(ym => {
    const r = map.get(ym);
    return {
      ym,
      orders_count: r ? Number(r.orders_count || 0) : 0,
      revenue_cents: r ? Number(r.revenue_cents || 0) : 0,
    };
  });
}

export default function AdminDashboard({
  onGoProducts,
  onGoOrders,
  onOpenOrder,
  onOpenProduct,
  onGoSettings,
}) {
  const [sum, setSum] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [loadingMonthly, setLoadingMonthly] = useState(true);
  const [errMonthly, setErrMonthly] = useState('');
  const [loadingSum, setLoadingSum] = useState(true);
  const [errSum, setErrSum] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    (async () => {
      // summary
      try {
        setLoadingSum(true);
        setErrSum('');
        const res = await fetch(`${API_BASE}/admin/summary`, { credentials: 'include' });
        if (!res.ok) throw new Error(await res.text());
        setSum(await res.json());
      } catch (e) {
        console.error(e);
        setErrSum('摘要資料讀取失敗');
      } finally {
        setLoadingSum(false);
      }

      // monthly
      try {
        setLoadingMonthly(true);
        setErrMonthly('');
        const res = await fetch(`${API_BASE}/admin/metrics/monthly`, { credentials: 'include' });
        if (!res.ok) throw new Error(await res.text());
        const m = await res.json();
        const mArray = Array.isArray(m) ? m : [];
        setMonthly(padMonthly(mArray));
        // 如果實際資料筆數少於 12，則顯示提示
        if (mArray.length < 12) {
          setErrMonthly('資料不足，此為示範圖表');
        }
      } catch (e) {
        console.error(e);
        setMonthly([]);
        setErrMonthly('報表資料讀取失敗');
      } finally {
        setLoadingMonthly(false);
      }
    })();
  }, []);

  const barOrders = useMemo(
    () => monthly.map(r => ({ label: r.ym.slice(5), value: r.orders_count, ym: r.ym })),
    [monthly]
  );
  const barRevenue = useMemo(
    () => monthly.map(r => ({ label: r.ym.slice(5), value: (r.revenue_cents || 0) / 100, ym: r.ym })),
    [monthly]
  );

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
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-2 text-sm rounded-md border hover:bg-white"
            >
              {showPreview ? '隱藏預覽' : '預覽報表'}
            </button>
            {onGoSettings && (
              <button onClick={onGoSettings} className="px-3 py-2 text-sm rounded-md border hover:bg-white">
                ⚙️ 網站設定
              </button>
            )}
          </div>
        </div>

        {/* 圖表區 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <RechartsBarChart
            title="月訂單數 (近12個月)"
            data={barOrders}
            loading={loadingMonthly}
            error={errMonthly && !loadingMonthly ? errMonthly : ''}
          />
          <RechartsBarChart
            title="月營收TWD (近12個月)"
            data={barRevenue}
            loading={loadingMonthly}
            error={errMonthly && !loadingMonthly ? errMonthly : ''}
          />
        </div>

        {/* 月報表預覽表格 */}
        {showPreview && (
          <div className="bg-white rounded-xl shadow p-4 mb-6">
            <h2 className="font-semibold text-lg mb-2">月報表預覽</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b bg-gray-50">
                    <th className="px-3 py-2">月份</th>
                    <th className="px-3 py-2">訂單數</th>
                    <th className="px-3 py-2">營收 (TWD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {monthly.map(m => (
                    <tr key={m.ym}>
                      <td className="px-3 py-2">{m.ym}</td>
                      <td className="px-3 py-2">{m.orders_count}</td>
                      <td className="px-3 py-2">{ (m.revenue_cents / 100).toLocaleString('zh-TW', { style: 'currency', currency: 'TWD' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 最新待處理訂單 + 熱銷商品 + 最新商品 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 待處理訂單 */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">待處理訂單（最新 5 筆）</h2>
              <button onClick={onGoOrders} className="text-sm text-gray-600 hover:text-gray-900">查看全部 →</button>
            </div>
            <ul className="divide-y">
              {loadingSum ? (
                <li className="py-3 text-sm text-gray-500">載入中…</li>
              ) : errSum ? (
                <li className="py-3 text-sm text-red-600">{errSum}</li>
              ) : (sum?.latestPending?.length ? sum.latestPending : []).map(o => (
                <li key={o.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">#{o.id}・{o.totalText}</div>
                    <div className="text-xs text-gray-500">{o.created_at}</div>
                  </div>
                  <button onClick={() => onOpenOrder(o.id)} className="px-2 py-1 text-sm border rounded hover:bg-gray-50">管理</button>
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
              {loadingSum ? (
                <li className="py-3 text-sm text-gray-500">載入中…</li>
              ) : errSum ? (
                <li className="py-3 text-sm text-red-600">{errSum}</li>
              ) : (sum?.topProducts30d?.length ? sum.topProducts30d : []).map(p => (
                <li key={p.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">銷量 {p.qty} ・ {p.revText}</div>
                  </div>
                  <button onClick={() => onOpenProduct(p.id)} className="px-2 py-1 text-sm border rounded hover:bg-gray-50">編輯</button>
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
              {loadingSum ? (
                <li className="py-3 text-sm text-gray-500">載入中…</li>
              ) : errSum ? (
                <li className="py-3 text-sm text-red-600">{errSum}</li>
              ) : (sum?.latestProducts?.length ? sum.latestProducts : []).map(p => (
                <li key={p.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">#{p.id}・{p.priceText}・{p.category}</div>
                  </div>
                  <button onClick={() => onOpenProduct(p.id)} className="px-2 py-1 text-sm border rounded hover:bg-gray-50">編輯</button>
                </li>
              )) || <div className="text-sm text-gray-500 py-3">—</div>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}