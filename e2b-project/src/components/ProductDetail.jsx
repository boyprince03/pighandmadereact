// /frontend/src/components/ProductDetail.jsx
import React, { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// 愛心圖示（沿用）
const HeartIcon = ({ filled = false, className = '' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    {filled ? (
      <path d="M12.001 21s-7.16-4.534-9.833-8.39C-0.195 9.51 1.28 5.5 4.97 4.64c1.973-.462 4.02.266 5.23 1.86 1.21-1.594 3.258-2.322 5.23-1.86 3.69.86 5.166 4.87 2.803 7.97C19.161 16.466 12.001 21 12.001 21z" fill="currentColor" />
    ) : (
      <path d="M12.001 21s-7.16-4.534-9.833-8.39C-0.195 9.51 1.28 5.5 4.97 4.64c1.973-.462 4.02.266 5.23 1.86 1.21-1.594 3.258-2.322 5.23-1.86 3.69.86 5.166 4.87 2.803 7.97C19.161 16.466 12.001 21 12.001 21z" fill="none" stroke="currentColor" strokeWidth="2" />
    )}
  </svg>
);

export default function ProductDetail({ productId, onBack, onAddToCart, isFavorite, toggleFavorite }) {
  const [product, setProduct] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (id) => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch(`${API_BASE}/products/${encodeURIComponent(id)}`, { credentials: 'include' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || '商品載入失敗');
      }
      const data = await res.json();
      setProduct(data);
    } catch (e) {
      setErr(e.message || '發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId != null) load(productId);
  }, [productId]);

  return (
    <div className="bg-gray-50 min-h-[60vh]">
      <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">商品介紹</h1>
          <div className="space-x-2">
            <button onClick={onBack} className="text-sm px-3 py-2 rounded-md border">← 返回商品</button>
          </div>
        </div>

        {loading && <div className="bg-white p-6 rounded-xl shadow">載入中…</div>}
        {err && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">{err}</div>
        )}

        {product && !loading && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              <div className="relative">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {/* 單品頁的愛心按鈕 */}
                <button
                  type="button"
                  onClick={() => toggleFavorite?.(product.id)}
                  aria-label={isFavorite(product.id) ? '移除我的最愛' : '加入我的最愛'}
                  className={`absolute top-3 right-3 p-3 rounded-full shadow-sm transition ${
                    isFavorite(product.id) ? 'bg-rose-500 text-white' : 'bg-white text-gray-700 hover:text-rose-500'
                  }`}
                >
                  <HeartIcon filled={isFavorite(product.id)} className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 md:p-8 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">{product.name}</h2>
                    <div className="mt-1 text-sm text-gray-500">分類：{product.category}</div>
                  </div>
                </div>

                <div className="mt-4 text-3xl font-bold text-gray-900">
                  {product.priceText ?? `NT$${product.price}`}
                </div>

                {/* 可放描述（目前後端沒有欄位，示意段落） */}
                <p className="mt-6 text-gray-700 leading-relaxed">
                  精選商品，品質保證。此頁為單獨商品介紹頁示範，價格、分類與圖片皆取自後端 API。
                </p>

                <div className="mt-auto pt-6">
                  <button
                    onClick={() => onAddToCart(product)}
                    className="w-full bg-gray-900 text-white py-3 rounded-lg text-base font-medium hover:bg-black transition"
                  >
                    加入購物車
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
