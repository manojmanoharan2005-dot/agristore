import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Products = () => {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'popularity';
  const inStock = searchParams.get('inStock') || 'false';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  const loadWishlistIds = async () => {
    if (!isAuthenticated) {
      setWishlistIds(new Set());
      return;
    }
    try {
      const { data } = await api.get('/wishlist');
      setWishlistIds(new Set((data.wishlist || []).map((item) => item._id)));
    } catch {
      setWishlistIds(new Set());
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (search) {
          const { data } = await api.get('/products/search', { params: { query: search } });
          setProducts(data.products || []);
        } else {
          const { data } = await api.get('/products', {
            params: {
              category: category || undefined,
              minPrice: minPrice || undefined,
              maxPrice: maxPrice || undefined,
              inStock,
              sort: sort === 'popularity' ? undefined : sort
            }
          });
          setProducts(data.products || []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [category, search, minPrice, maxPrice, inStock, sort]);

  useEffect(() => {
    loadWishlistIds();
  }, [isAuthenticated]);

  const categories = useMemo(
    () => ['All', 'Organic', 'Seeds', 'Pesticide', 'Equipment', 'Chemical', 'Bio-Fertilizer'],
    []
  );
  const sortTabs = useMemo(
    () => [
      { label: 'POPULAR', value: 'popularity' },
      { label: 'LOWEST PRICE', value: 'price_asc' },
      { label: 'HIGHEST PRICE', value: 'price_desc' },
      { label: 'LATEST ARRIVAL', value: 'newest' }
    ],
    []
  );

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'All' || value === 'false') next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  };

  return (
    <div className="page-container py-8">
      <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">
        <aside className="card p-8 lg:sticky lg:top-24 h-fit">
          <h2 className="text-[2rem] font-black italic text-slate-800">Filters</h2>

          <div className="mt-8">
            <p className="text-xs tracking-[0.18em] font-extrabold text-slate-400">COLLECTIONS</p>
            <div className="mt-4 space-y-2">
              {categories.map((cat) => {
                const active = (category || 'All') === cat;
                return (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => updateParam('category', cat)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl font-semibold transition-colors ${active ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <input className="input-field" placeholder="Min price" value={minPrice} onChange={(e) => updateParam('minPrice', e.target.value)} />
            <input className="input-field" placeholder="Max price" value={maxPrice} onChange={(e) => updateParam('maxPrice', e.target.value)} />
            <select className="input-field" value={inStock} onChange={(e) => updateParam('inStock', e.target.value)}>
              <option value="false">All stock</option>
              <option value="true">In stock only</option>
            </select>
          </div>
        </aside>

        <section>
          <div className="card p-8 md:p-10">
            <div className="flex flex-wrap items-center gap-3 text-xs font-extrabold tracking-[0.2em] text-slate-400">
              <span>HOME</span>
              <span className="text-slate-300">-</span>
              <span className="text-slate-800 underline underline-offset-4">MARKETPLACE</span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <h1 className="text-[3.2rem] leading-none font-black italic text-slate-800">Marketplace</h1>
              <span className="text-slate-400 text-xl font-semibold">Explore {products.length}</span>
            </div>

            {search && (
              <p className="mt-3 text-sm text-slate-500">Search results for <strong>{search}</strong></p>
            )}

            <div className="mt-6 rounded-2xl bg-slate-100 border border-slate-200 p-2 flex flex-wrap gap-2">
              {sortTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => updateParam('sort', tab.value)}
                  className={`px-6 py-3 text-xs md:text-sm font-black tracking-wide rounded-xl transition-colors ${sort === tab.value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="min-h-[360px] grid place-items-center text-center">
                <div>
                  <div className="mx-auto h-14 w-14 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <p className="mt-5 text-xl font-extrabold tracking-[0.12em] text-slate-400">LOADING PRODUCTS...</p>
                </div>
              </div>
            ) : products.length === 0 ? (
              <div className="min-h-[260px] grid place-items-center text-center text-slate-500 text-lg font-semibold">No products found.</div>
            ) : (
                <div className="mt-8 grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                {products.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={{ ...product, isWishlisted: wishlistIds.has(product._id) }}
                    onWishlistChange={loadWishlistIds}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Products;
