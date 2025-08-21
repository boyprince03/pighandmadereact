// frontend/src/components/CheckoutPage.jsx
import React, { useMemo, useState } from 'react';

const nf = new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD' });

const CheckoutPage = ({ cart, setCart, setView }) => {
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const shipping = cart.length > 0 ? 60 : 0;

  const subtotal = useMemo(() => {
    return cart.reduce((total, item) => {
      const price = Number(item.price);
      return total + price * item.quantity;
    }, 0);
  }, [cart]);

  const total = subtotal + shipping;

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    setCart(cart.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item));
  };

  const handleRemoveItem = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const submitOrder = async () => {
    if (!cart.length) return;

    const payload = {
      customer,
      items: cart.map(it => ({ productId: it.id, quantity: it.quantity }))
    };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? '下單失敗');
      return;
    }

    const data = await res.json();
    alert(`下單成功！\n訂單編號：${data.orderNo}\n總計：${data.totalText}`);
    setCart([]);
    setView('products');
  };

  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-8">購物車</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white shadow sm:rounded-lg">
              <ul role="list" className="divide-y divide-gray-200">
                {cart.length > 0 ? (
                  cart.map((product) => (
                    <li key={product.id} className="flex py-6 px-4 sm:px-6">
                      <div className="flex-shrink-0">
                        <img src={product.image} alt={product.name} className="w-24 h-24 rounded-md object-center object-cover sm:w-32 sm:h-32" />
                      </div>

                      <div className="ml-4 flex-1 flex flex-col sm:ml-6">
                        <div>
                          <div className="flex justify-between">
                            <h4 className="text-sm">
                              <span className="font-medium text-gray-700 hover:text-gray-800">{product.name}</span>
                            </h4>
                            <p className="ml-4 text-sm font-medium text-gray-900">{product.priceText ?? nf.format(product.price)}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex-1 flex items-end justify-between">
                          <div className="flex items-center">
                            <label htmlFor={`quantity-${product.id}`} className="sr-only">Quantity</label>
                            <select
                              id={`quantity-${product.id}`}
                              name={`quantity-${product.id}`}
                              value={product.quantity}
                              onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value))}
                              className="block max-w-full rounded-md border border-gray-300 py-1.5 text-base leading-5 font-medium text-gray-700 text-left shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                              {[...Array(10).keys()].map(i => <option key={i+1} value={i+1}>{i+1}</option>)}
                            </select>
                          </div>
                          <div className="ml-4">
                            <button type="button" onClick={() => handleRemoveItem(product.id)} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                              <span>移除</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <div className="text-center py-16 px-4 sm:px-6">
                    <h3 className="text-lg font-medium text-gray-900">您的購物車是空的</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      <button onClick={() => setView('products')} className="font-medium text-indigo-600 hover:text-indigo-500">
                        繼續購物<span aria-hidden="true"> &rarr;</span>
                      </button>
                    </p>
                  </div>
                )}
              </ul>
            </div>

            <button onClick={() => setView('products')} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              <span aria-hidden="true">&larr; </span>繼續購物
            </button>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white shadow sm:rounded-lg p-6 space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">收件人資訊</h2>
                <div className="mt-4 space-y-3">
                  <input
                    className="w-full border rounded-md p-2"
                    placeholder="姓名"
                    value={customer.name}
                    onChange={(e) => setCustomer(c => ({ ...c, name: e.target.value }))}
                  />
                  <input
                    className="w-full border rounded-md p-2"
                    placeholder="電話"
                    value={customer.phone}
                    onChange={(e) => setCustomer(c => ({ ...c, phone: e.target.value }))}
                  />
                  <input
                    className="w-full border rounded-md p-2"
                    placeholder="地址"
                    value={customer.address}
                    onChange={(e) => setCustomer(c => ({ ...c, address: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-medium text-gray-900">訂單摘要</h2>
                <dl className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-gray-600">小計</dt>
                    <dd className="text-sm font-medium text-gray-900">{nf.format(subtotal)}</dd>
                  </div>
                  <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
                    <dt className="flex items-center text-sm text-gray-600">
                      <span>運費</span>
                    </dt>
                    <dd className="text-sm font-medium text-gray-900">{nf.format(shipping)}</dd>
                  </div>
                  <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
                    <dt className="text-base font-medium text-gray-900">訂單總計</dt>
                    <dd className="text-base font-medium text-gray-900">{nf.format(total)}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <button
                  type="button"
                  onClick={submitOrder}
                  disabled={cart.length === 0}
                  className="w-full bg-indigo-600 border border-transparent rounded-md shadow-sm py-3 px-4 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-indigo-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  送出訂單
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
