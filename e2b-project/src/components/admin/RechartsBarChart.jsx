import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/**
 * 使用 Recharts 製作的柱狀圖
 * @param {string} title - 圖表標題
 * @param {Array<object>} data - 圖表資料
 * @param {string} valueKey - 資料中作為數值的鍵名
 * @param {string} labelKey - 資料中作為標籤的鍵名
 * @param {boolean} loading - 載入狀態
 * @param {string} error - 錯誤訊息
 */
export default function RechartsBarChart({ title, data = [], valueKey = 'value', labelKey = 'label', loading, error }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-4">
        <div className="text-sm text-gray-600 mb-2">{title}</div>
        <div className="h-40 flex items-center justify-center text-sm text-gray-500">載入中…</div>
      </div>
    );
  }

  // 判斷是否為示範資料
  const isDemo = data.length > 0 && data[0]?.ym?.includes('2024-');

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-sm text-gray-600 mb-2">
        {title}
        {isDemo && <span className="text-xs text-gray-400 ml-2">（示範資料）</span>}
      </div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={labelKey} />
            <YAxis />
            <Tooltip />
            <Bar dataKey={valueKey} fill="#4b5563" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {error && (
        <p className="text-red-600 text-sm mt-4 text-center">{error}</p>
      )}
    </div>
  );
}