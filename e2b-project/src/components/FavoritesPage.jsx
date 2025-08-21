// /components/FavoritesPage.jsx
import React from 'react';
import ProductGrid from './ProductGrid';

export default function FavoritesPage({
  products,
  onBack,
  onAddToCart,
  onOpenProduct,
  isFavorite,
  toggleFavorite,
}) {
  return (
    <div className="bg-gray-50 min-h-[60vh]">
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">我的最愛清單</h1>
          <button onClick={onBack} className="text-sm px-3 py-2 rounded-md border hover:bg-white">
            ← 返回商品
          </button>
        </div>

        {products.length === 0 ? (
          <div className="mt-8 bg-white rounded-xl shadow p-8 text-center">
            <p className="text-gray-700">目前尚未加入任何我的最愛。</p>
            <button
              onClick={onBack}
              className="mt-4 inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border hover:bg-gray-50"
            >
              回去逛逛 →
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <ProductGrid
              products={products}
              onAddToCart={onAddToCart}
              onOpenProduct={onOpenProduct}
              isFavorite={isFavorite}
              toggleFavorite={toggleFavorite}
            />
          </div>
        )}
      </div>
    </div>
  );
}
