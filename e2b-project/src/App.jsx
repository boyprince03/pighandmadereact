// /frontend/src/App.jsx
import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import InfoSection from './components/InfoSection';
import ProductGrid from './components/ProductGrid';
import Footer from './components/Footer';
import CheckoutPage from './components/CheckoutPage';
import LoginRegister from './components/LoginRegister';
import OrderLookup from './components/OrderLookup';
import ProductDetail from './components/ProductDetail';
import FavoritesPage from './components/FavoritesPage';

// ★ Admin 頁面
import AdminDashboard from './components/admin/AdminDashboard';
import AdminProducts from './components/admin/AdminProducts';
import AdminProductForm from './components/admin/AdminProductForm';
import AdminOrders from './components/admin/AdminOrders';
import AdminOrderDetail from './components/admin/AdminOrderDetail';

function App() {
  const [allProducts, setAllProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);

  // 檢視狀態
  // 前台：products / product / favorites / checkout / orders
  // 後台：admin / admin-products / admin-product-edit / admin-orders / admin-order
  const [view, setView] = useState('products');
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [adminProductId, setAdminProductId] = useState(null);
  const [adminOrderId, setAdminOrderId] = useState(null);

  // auth
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);

  // 我的最愛：localStorage 永續化
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem('favorites');
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(arr);
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(Array.from(favorites)));
  }, [favorites]);

  const isFavorite = (id) => favorites.has(Number(id));
  const toggleFavorite = (id) => {
    setFavorites(prev => {
      const next = new Set(prev);
      const key = Number(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const API_BASE = import.meta.env.VITE_API_BASE || '/api';

  // 產品載入（前台）
  useEffect(() => {
    const load = async () => {
      try {
        let res = await fetch(`${API_BASE}/products`, { credentials: 'include' });
        if (!res.ok) throw new Error('proxy not ready');
        const data = await res.json();
        setAllProducts(data);
        setDisplayedProducts(data);
      } catch (e) {
        try {
          let res2 = await fetch(`http://localhost:4000/api/products`, { credentials: 'include' });
          const data2 = await res2.json();
          setAllProducts(data2);
          setDisplayedProducts(data2);
        } catch (err) {
          console.error(err);
        }
      }
    };
    load();
  }, []);

  // 啟動時嘗試帶 Cookie 查詢登入狀態
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/profile`, { credentials: 'include' });
        if (res.ok) {
          const u = await res.json();
          setUser(u); // u 內含 isAdmin
        }
      } catch {}
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(allProducts.map(p => p.category));
    return ['all', ...Array.from(set)];
  }, [allProducts]);

  const applyFiltersAndSearch = (category, term) => {
    let products = allProducts;
    if (category !== 'all') products = products.filter(p => p.category === category);
    if (term.trim()) products = products.filter(p => p.name.toLowerCase().includes(term.toLowerCase()));
    setDisplayedProducts(products);
  };

  const handleFilterChange = (category) => {
    setActiveFilter(category);
    applyFiltersAndSearch(category, searchTerm);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    applyFiltersAndSearch(activeFilter, term);
  };

  const addToCart = (productToAdd) => {
    setCart(prev => {
      const found = prev.find(i => i.id === productToAdd.id);
      return found
        ? prev.map(i => i.id === productToAdd.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { ...productToAdd, quantity: 1 }];
    });
  };

  const handleLogout = async () => {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
    setView('products');
  };

  // 切到單品頁（前台）
  const openProductDetail = (id) => {
    setSelectedProductId(Number(id));
    setView('product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 我的最愛清單
  const favoriteProducts = useMemo(
    () => allProducts.filter(p => favorites.has(Number(p.id))),
    [allProducts, favorites]
  );

  // ========== UI ==========
  return (
    <div className="bg-white font-sans">
      <Header
        cartItemCount={cart.reduce((c, i) => c + i.quantity, 0)}
        setView={setView}
        user={user}
        onOpenAuth={() => setAuthOpen(true)}
        onLogout={handleLogout}
      />

      <main>
        {view === 'products' && (
          <>
            <Hero />
            <InfoSection
              onFilterChange={handleFilterChange}
              activeFilter={activeFilter}
              onSearch={handleSearch}
              categories={categories}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 flex justify-end">
              <button
                onClick={() => setView('favorites')}
                className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border hover:bg-gray-50"
                aria-label="查看我的最愛清單"
              >
                <span>❤️</span>
                <span>我的最愛清單（{favoriteProducts.length}）</span>
              </button>
            </div>
            <ProductGrid
              products={displayedProducts}
              onAddToCart={addToCart}
              onOpenProduct={openProductDetail}
              isFavorite={isFavorite}
              toggleFavorite={toggleFavorite}
            />
          </>
        )}

        {view === 'favorites' && (
          <FavoritesPage
            products={favoriteProducts}
            onBack={() => setView('products')}
            onAddToCart={addToCart}
            onOpenProduct={openProductDetail}
            isFavorite={isFavorite}
            toggleFavorite={toggleFavorite}
          />
        )}

        {view === 'product' && selectedProductId != null && (
          <ProductDetail
            productId={selectedProductId}
            onBack={() => setView('products')}
            onAddToCart={addToCart}
            isFavorite={isFavorite}
            toggleFavorite={toggleFavorite}
          />
        )}

        {view === 'checkout' && (
          <CheckoutPage cart={cart} setCart={setCart} setView={setView} />
        )}

        {view === 'orders' && (
          <OrderLookup setView={setView} />
        )}

        {/* ===== 後台 ===== */}
        {user?.isAdmin && view === 'admin' && (
          <AdminDashboard
            onGoProducts={() => setView('admin-products')}
            onGoOrders={() => setView('admin-orders')}
            onOpenOrder={(id) => { setAdminOrderId(id); setView('admin-order'); }}
            onOpenProduct={(id) => { setAdminProductId(id); setView('admin-product-edit'); }}
          />
        )}

        {user?.isAdmin && view === 'admin-products' && (
          <AdminProducts
            onBack={() => setView('admin')}
            onCreate={() => { setAdminProductId('new'); setView('admin-product-edit'); }}
            onEdit={(id) => { setAdminProductId(id); setView('admin-product-edit'); }}
          />
        )}

        {user?.isAdmin && view === 'admin-product-edit' && (
          <AdminProductForm
            productId={adminProductId}
            onBack={() => setView('admin-products')}
          />
        )}

        {user?.isAdmin && view === 'admin-orders' && (
          <AdminOrders
            onBack={() => setView('admin')}
            onOpen={(id) => { setAdminOrderId(id); setView('admin-order'); }}
          />
        )}

        {user?.isAdmin && view === 'admin-order' && (
          <AdminOrderDetail
            orderId={adminOrderId}
            onBack={() => setView('admin-orders')}
          />
        )}
      </main>

      <Footer />

      {/* 登入/註冊視窗 */}
      {authOpen && (
        <LoginRegister
          onClose={() => setAuthOpen(false)}
          onAuthed={(u) => {
            setUser(u);
            setAuthOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
