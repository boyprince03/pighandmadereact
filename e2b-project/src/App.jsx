import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import InfoSection from './components/InfoSection';
import ProductGrid from './components/ProductGrid';
import Footer from './components/Footer';
import CheckoutPage from './components/CheckoutPage';

function App() {
  const [allProducts, setAllProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [view, setView] = useState('products');

  // 允許用環境變數覆蓋，否則預設走 /api（由 Vite 代理）
  const API_BASE = import.meta.env.VITE_API_BASE || '/api';

  useEffect(() => {
    const load = async () => {
      try {
        // 先走代理
        let res = await fetch(`${API_BASE}/products`);
        if (!res.ok) throw new Error('proxy not ready');
        const data = await res.json();
        setAllProducts(data);
        setDisplayedProducts(data);
      } catch (e) {
        // 代理失敗就直連後端
        try {
          let res2 = await fetch(`http://localhost:4000/api/products`);
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

  return (
    <div className="bg-white font-sans">
      <Header cartItemCount={cart.reduce((c, i) => c + i.quantity, 0)} setView={setView} />
      <main>
        {view === 'products' ? (
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
        ) : (
          <CheckoutPage cart={cart} setCart={setCart} setView={setView} />
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;
