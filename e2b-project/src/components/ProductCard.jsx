import React from 'react';

const ProductCard = ({ product, onAddToCart }) => {
  return (
    <div className="group relative flex flex-col">
      <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-md bg-gray-200 lg:aspect-none group-hover:opacity-75 transition-opacity duration-200">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover object-center lg:h-full lg:w-full"
        />
      </div>
      <div className="mt-4 flex flex-col flex-grow">
        <h3 className="text-sm text-gray-700">
          <span className="font-medium">{product.name}</span>
        </h3>
        <p className="mt-1 text-lg font-medium text-gray-900">{product.priceText ?? `NT$${product.price}`}</p>
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
