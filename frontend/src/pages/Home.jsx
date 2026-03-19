import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wheat, FlaskConical, Bug, Leaf, Tractor, Sprout } from 'lucide-react';
import api from '../utils/api';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';

const categories = [
  { name: 'Organic', icon: Leaf, color: 'bg-emerald-100 text-emerald-700' },
  { name: 'Chemical', icon: FlaskConical, color: 'bg-slate-100 text-slate-700' },
  { name: 'Bio-Fertilizer', icon: Sprout, color: 'bg-lime-100 text-lime-700' },
  { name: 'Pesticide', icon: Bug, color: 'bg-amber-100 text-amber-700' },
  { name: 'Seeds', icon: Wheat, color: 'bg-orange-100 text-orange-700' },
  { name: 'Equipment', icon: Tractor, color: 'bg-slate-100 text-slate-700' }
];

const marketTicker = [
  'Urea: Rs. 299/bag',
  'DAP: Rs. 1350/bag',
  'NPK 19-19-19: Rs. 890/kg',
  'Paddy Seeds: Rs. 65/kg',
  'Tomato Hybrid: Rs. 250/packet',
  'Mancozeb: Rs. 180/kg'
];

const Home = () => {
  const { isAuthenticated } = useAuth();
  const [trending, setTrending] = useState([]);
  const [wishlistIds, setWishlistIds] = useState(new Set());

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
    const fetchTrending = async () => {
      const { data } = await api.get('/products', { params: { trending: true } });
      setTrending(data.products || []);
    };
    fetchTrending();
  }, []);

  useEffect(() => {
    loadWishlistIds();
  }, [isAuthenticated]);

  return (
    <main>
      <div className="bg-secondary text-white py-2 overflow-hidden">
        <div className="ticker-content">
          {[...marketTicker, ...marketTicker].map((text, idx) => (
            <span key={`${text}-${idx}`} className="mx-6 text-sm">{text}</span>
          ))}
        </div>
      </div>

      <section className="bg-primary text-white py-12">
        <div className="page-container grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-accent text-sm font-semibold mb-2">FARM INPUTS MEGA STORE</p>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              Smart Farming Starts With Better Inputs
            </h1>
            <p className="mt-4 text-slate-200 max-w-lg">
              Buy trusted fertilizers, pesticides, seeds, and equipment with AI recommendations,
              better prices, and doorstep delivery across India.
            </p>
            <div className="mt-6 flex gap-3">
              <Link to="/products" className="btn-primary">Browse Products</Link>
              <Link to="/products?category=Seeds" className="bg-white text-primary px-6 py-2.5 rounded-sm font-semibold">
                Explore Seeds
              </Link>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="bg-white text-secondary rounded-sm p-8 shadow-2xl">
              <p className="text-sm text-primary font-semibold">AgriSmart AI Suggestion</p>
              <p className="mt-2 text-xl font-semibold">For pre-monsoon paddy prep:</p>
              <ul className="mt-4 space-y-2 text-gray-700 text-sm">
                <li>Use DAP at sowing for root strength</li>
                <li>Apply bio-fertilizer for soil activity</li>
                <li>Keep fungicide ready for early leaf spots</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 bg-white border-b border-gray-200">
        <div className="page-container">
          <h2 className="text-xl font-bold text-secondary mb-4">Shop By Category</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {categories.map(cat => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.name}
                  to={`/products?category=${encodeURIComponent(cat.name)}`}
                  className="p-3 text-center border border-gray-100 rounded-sm hover:shadow-sm bg-white"
                >
                  <div className={`mx-auto mb-2 w-11 h-11 rounded-full flex items-center justify-center ${cat.color}`}>
                    <Icon size={20} />
                  </div>
                  <p className="font-medium text-xs text-secondary">{cat.name}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="page-container">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-secondary">Trending Products</h2>
            <Link to="/products?trending=true" className="text-primary font-semibold text-sm">View all</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {trending.slice(0, 8).map(product => (
              <ProductCard
                key={product._id}
                product={{ ...product, isWishlisted: wishlistIds.has(product._id) }}
                onWishlistChange={loadWishlistIds}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default Home;
