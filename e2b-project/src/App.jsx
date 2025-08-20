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

function App() {
  const [allProducts, setAllProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [view, setView] = useState('products');

  // 🔐 auth
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE || '/api';

  // 產品載入
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
          setUser(u);
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

  const handleOpenAuth = () => setAuthOpen(true);
  const handleLogout = async () => {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
  };

  return (
    <div className="bg-white font-sans">
      <Header
        cartItemCount={cart.reduce((c, i) => c + i.quantity, 0)}
        setView={setView}
        user={user}
        onOpenAuth={handleOpenAuth}
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
            <ProductGrid products={displayedProducts} onAddToCart={addToCart} />
          </>
        )}

        {view === 'checkout' && (
          // ✅ 結帳頁依舊「不要求登入」
          <CheckoutPage cart={cart} setCart={setCart} setView={setView} />
        )}

        {view === 'orders' && (
          <OrderLookup setView={setView} />
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
