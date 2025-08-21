// /src/components/ProductDetail.jsx
import React, { useEffect, useState } from 'react';
import HeartButton from './HeartButton';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

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
                {/* 單品頁的愛心按鈕（右上角） */}
                <div className="absolute top-3 right-3">
                  <HeartButton
                    active={!!isFavorite(product.id)}
                    onToggle={() => toggleFavorite?.(product.id)}
                    size="md"
                  />
                </div>
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
