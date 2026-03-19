import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sprout, Search, ShoppingCart, User, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../utils/api';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { getCartCount } = useCart();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [shrink, setShrink] = useState(false);

  const cartCount = useMemo(() => getCartCount(), [getCartCount, results]);
  const displayName = user?.name?.toUpperCase() || 'ACCOUNT';
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    const onScroll = () => setShrink(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/products', { params: { search: query } });
        setResults(data.products?.slice(0, 6) || []);
        setShowDropdown(true);
      } catch {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    navigate(`/products?search=${encodeURIComponent(query.trim())}`);
    setShowDropdown(false);
  };

  return (
    <header className={`sticky top-0 z-30 backdrop-blur-sm border-b border-slate-200/80 transition-all ${shrink ? 'py-2' : 'py-3'} bg-white/95`}>
      <div className="page-container">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 lg:gap-6">
          <Link to={isAdmin ? '/admin' : '/'} className="flex items-center gap-3 shrink-0">
            <span className="h-11 w-11 rounded-2xl bg-[#151515] text-emerald-500 grid place-items-center shadow-sm">
              <Sprout size={21} />
            </span>
            <div className="leading-none">
              <p className="font-black text-[2rem] tracking-tight text-slate-800">AgriStore</p>
              <p className="text-[11px] font-bold tracking-[0.16em] text-slate-400 mt-1">PREMIUM QUALITY</p>
            </div>
          </Link>

          {!isAdminRoute && (
            <form onSubmit={onSearchSubmit} className="relative w-full max-w-3xl justify-self-center">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search premium products..."
                className={`w-full pl-7 py-4 rounded-2xl border border-slate-200 bg-slate-100/80 text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-200 pr-14`}
              />

              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-11 w-11 rounded-xl bg-[#151515] text-white grid place-items-center"
              >
                <Search size={18} />
              </button>

              {showDropdown && results.length > 0 && (
                <div className="absolute top-[58px] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-lg p-2 z-20">
                  {results.map((item) => (
                    <button
                      key={item._id}
                      type="button"
                      onClick={() => {
                        navigate(`/products/${item._id}`);
                        setShowDropdown(false);
                        setQuery('');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50"
                    >
                      <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500">Rs. {item.price}</p>
                    </button>
                  ))}
                </div>
              )}
            </form>
          )}

          <div className="flex items-center gap-2 justify-self-end">
            {!isAdmin && (
              <Link
                to="/cart"
                className="relative p-2.5 rounded-2xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition-colors"
              >
                <ShoppingCart size={21} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            {isAuthenticated ? (
              <>
                {isAdmin ? (
                  <Link
                    to="/admin"
                    className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 text-sm rounded-xl inline-flex items-center gap-2 font-semibold transition-colors"
                  >
                    <Shield size={14} /> Admin
                  </Link>
                ) : (
                  <Link
                    to="/profile"
                    className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-700 font-bold"
                  >
                    <span className="h-8 w-8 rounded-xl border border-slate-200 grid place-items-center"><User size={16} /></span>
                    <span className="max-w-[170px] truncate">{displayName}</span>
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="bg-white border border-slate-200 text-slate-800 text-sm font-semibold px-4 py-2.5 rounded-xl">Login</Link>
                <Link to="/register" className="bg-slate-800 text-white text-sm px-4 py-2.5 rounded-xl font-bold">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
