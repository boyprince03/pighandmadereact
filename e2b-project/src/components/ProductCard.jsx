// /src/components/ProductCard.jsx
import React from 'react';
import HeartButton from './HeartButton';

const ProductCard = ({ product, onAddToCart, onOpenProduct, isFavorite, onToggleFavorite }) => {
  const active = !!isFavorite;

  return (
    <div className="group relative flex flex-col">
      {/* 圖片可點擊進入單品頁 */}
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
          loading="lazy"
        />

        {/* 漂亮愛心按鈕（右上角浮層） */}
        <div className="absolute top-2 right-2">
          <HeartButton
            active={active}
            onToggle={onToggleFavorite}
            size="sm"
          />
        </div>
      </button>

      <div className="mt-4 flex flex-col flex-grow">
        <h3 className="text-sm text-gray-700">
          <span className="font-medium">{product.name}</span>
        </h3>
        <p className="mt-1 text-lg font-medium text-gray-900">
          {product.priceText ?? `NT$${product.price}`}
        </p>

        <div className="mt-auto pt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => onAddToCart(product)}
            className="col-span-2 w-full bg-gray-800 text-white text-sm font-medium py-2 px-4 rounded-md hover:bg-gray-900 transition-colors duration-200"
          >
            加入購物車
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
