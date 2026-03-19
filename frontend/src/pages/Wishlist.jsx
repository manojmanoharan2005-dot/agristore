import { useEffect, useState } from 'react';
import UserSidebar from '../components/UserSidebar';
import ProductCard from '../components/ProductCard';
import api from '../utils/api';
import { useCart } from '../context/CartContext';

const Wishlist = () => {
  const { addToCart } = useCart();
  const [wishlist, setWishlist] = useState([]);

  const load = async () => {
    const { data } = await api.get('/wishlist');
    setWishlist(data.wishlist || []);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    await api.delete(`/wishlist/${id}`);
    load();
  };

  return (
    <div className="page-container py-8 grid lg:grid-cols-[320px_1fr] gap-6 items-start">
      <UserSidebar />

      <div className="space-y-5">
        <div className="card p-8 md:p-10">
          <p className="text-xs tracking-[0.18em] font-extrabold text-slate-400">ACCOUNT</p>
          <h1 className="text-[3rem] font-black italic leading-none text-slate-800 mt-2">Wishlist</h1>
        </div>

        {wishlist.length === 0 ? (
          <div className="card p-10 text-center text-slate-400 font-bold">Your wishlist is empty.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {wishlist.map(product => (
                <ProductCard key={product._id} product={product} onWishlistChange={load} />
              ))}
            </div>

            <div className="space-y-2">
              {wishlist.map(item => (
                <div key={`action-${item._id}`} className="card p-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-700">{item.name}</p>
                  <div className="flex gap-2">
                    <button className="btn-secondary px-4 py-2 text-xs font-black tracking-wide" onClick={() => addToCart(item, 1)}>ADD TO CART</button>
                    <button className="text-red-600 text-xs font-black tracking-wide px-3" onClick={() => remove(item._id)}>REMOVE</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
