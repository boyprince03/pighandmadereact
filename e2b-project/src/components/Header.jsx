import React from 'react';

const Header = ({ cartItemCount, setView, user, onOpenAuth, onLogout }) => {
  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex-shrink-0">
            <button onClick={() => setView('products')} className="text-2xl font-bold text-gray-900 focus:outline-none">
              豬豬手做
            </button>
          </div>

          <div className="flex items-center space-x-4">
            {/* 使用者區塊 */}
            {!user ? (
              <button
                onClick={onOpenAuth}
                className="inline-flex items-center px-3 py-2 text-sm rounded-md bg-gray-900 text-white hover:bg-black"
              >
                登入 / 註冊
              </button>
            ) : (
              <div className="flex items-center space-x-3">
                <span className="text-gray-700 text-sm">
                  嗨，{user.name || user.email}
                </span>
                <button
                  onClick={onLogout}
                  className="text-sm text-gray-500 hover:text-gray-900"
                >
                  登出
                </button>
              </div>
            )}

            {/* 購物車 */}
            <button onClick={() => setView('checkout')} className="relative text-gray-500 hover:text-gray-900 focus:outline-none">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
