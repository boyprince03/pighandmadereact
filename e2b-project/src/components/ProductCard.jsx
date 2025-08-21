// /frontend/src/components/ProductCard.jsx
import React from 'react';

// 簡單的愛心圖示（空心/實心）
const HeartIcon = ({ filled = false, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
  >
    {filled ? (
      <path
        d="M12.001 21s-7.16-4.534-9.833-8.39C-0.195 9.51 1.28 5.5 4.97 4.64c1.973-.462 4.02.266 5.23 1.86 1.21-1.594 3.258-2.322 5.23-1.86 3.69.86 5.166 4.87 2.803 7.97C19.161 16.466 12.001 21 12.001 21z"
        fill="currentColor"
      />
    ) : (
      <path
        d="M12.001 21s-7.16-4.534-9.833-8.39C-0.195 9.51 1.28 5.5 4.97 4.64c1.973-.462 4.02.266 5.23 1.86 1.21-1.594 3.258-2.322 5.23-1.86 3.69.86 5.166 4.87 2.803 7.97C19.161 16.466 12.001 21 12.001 21z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    )}
  </svg>
);

const ProductCard = ({ product, onAddToCart, onOpenProduct, isFavorite, onToggleFavorite }) => {
  return (
    <div className="group relative flex flex-col">
      {/* 讓圖片可點擊進入單品頁 */}
      <button
        type="button"
        onClick={() => onOpenProduct?.(product.id)}
        className="relative aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-md bg-gray-200 lg:aspect-none group-hover:opacity-90 transition-opacity duration-200 focus:outline-none"
        aria-label={`查看 ${product.name} 詳細`}
      >
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover object-center lg:h-full lg:w-full"
        />
        {/* 愛心：覆蓋在右上角 */}
        <span className="absolute top-2 right-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation(); // 不要觸發圖片的 onClick
              onToggleFavorite?.();
            }}
            aria-label={isFavorite ? '移除我的最愛' : '加入我的最愛'}
            className={`p-2 rounded-full shadow-sm transition ${
              isFavorite ? 'bg-rose-500 text-white' : 'bg-white text-gray-700 hover:text-rose-500'
            }`}
          >
            <HeartIcon filled={isFavorite} className="w-5 h-5" />
          </button>
        </span>
      </button>

      <div className="mt-4 flex flex-col flex-grow">
        <h3 className="text-sm text-gray-700">
          <span className="font-medium">{product.name}</span>
        </h3>
        <p className="mt-1 text-lg font-medium text-gray-900">
          {product.priceText ?? `NT$${product.price}`}
        </p>
        <div className="mt-auto pt-4">
          <button
            onClick={() => onAddToCart(product)}
            className="w-full bg-gray-800 text-white text-sm font-medium py-2 px-4 rounded-md hover:bg-gray-900 transition-colors duration-200"
          >
            加入購物車
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
