import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { toSafeImageUrl } from '../utils/imageUrl';
import UserSidebar from '../components/UserSidebar';

const Cart = () => {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeFromCart, getCartTotal } = useCart();
  const total = getCartTotal();
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="page-container py-8 grid lg:grid-cols-[320px_1fr] gap-6 items-start">
        <UserSidebar />
        <div className="card p-10 text-center">
          <p className="text-xs tracking-[0.2em] font-extrabold text-slate-400">CART</p>
          <h1 className="text-[3rem] font-black italic leading-none text-slate-800 mt-3">Your cart is empty</h1>
          <p className="text-slate-500 mt-4">Add products to build your premium checkout panel.</p>
          <Link to="/products" className="btn-secondary inline-block mt-8 px-8 py-3 rounded-2xl text-sm font-black tracking-[0.1em]">CONTINUE SHOPPING</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container py-8 grid lg:grid-cols-[320px_1fr] gap-6 items-start">
      <UserSidebar />

      <div className="space-y-6">
        <div className="card p-6 md:p-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.2em] font-extrabold text-slate-400">CART PANEL</p>
            <h1 className="text-[3.1rem] font-black italic leading-none text-slate-800 mt-2">Your Cart</h1>
            <p className="text-slate-500 mt-3">{itemCount} item(s) selected for checkout</p>
          </div>
          <div className="rounded-3xl bg-slate-100 border border-slate-200 px-6 py-4 text-right">
            <p className="text-xs tracking-[0.16em] font-extrabold text-slate-400">CURRENT TOTAL</p>
            <p className="text-[2.2rem] font-black leading-none text-slate-900 mt-1">Rs. {total}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item._id} className="card p-5 md:p-6">
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="h-24 w-24 rounded-2xl border border-slate-200 bg-slate-50 p-2 shrink-0 overflow-hidden">
                    <img src={toSafeImageUrl(item.imageUrl)} alt={item.name} className="h-full w-full object-contain" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[1.6rem] font-black leading-none text-slate-800">{item.name}</p>
                        <p className="mt-2 text-sm text-slate-400 font-semibold">Rs. {item.price} each</p>
                      </div>
                      <p className="text-[2rem] font-black leading-none text-slate-900">Rs. {item.price * item.quantity}</p>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-2 py-1">
                        <button
                          className="h-8 w-8 rounded-lg border border-slate-200 bg-white grid place-items-center text-slate-600"
                          onClick={() => updateQuantity(item._id, item.quantity - 1)}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-black text-slate-700">{item.quantity}</span>
                        <button
                          className="h-8 w-8 rounded-lg border border-slate-200 bg-white grid place-items-center text-slate-600"
                          onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button
                        className="inline-flex items-center gap-2 text-rose-500 font-black text-sm tracking-wide"
                        onClick={() => removeFromCart(item._id)}
                      >
                        <Trash2 size={15} /> REMOVE
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="card p-6 lg:sticky lg:top-24">
            <h2 className="text-[2rem] font-black leading-none text-slate-800">Order Summary</h2>
            <div className="mt-6 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between"><span>Subtotal</span><span className="font-bold text-slate-800">Rs. {total}</span></div>
              <div className="flex items-center justify-between"><span>Delivery</span><span className="font-bold text-emerald-600">Free</span></div>
              <div className="border-t border-slate-200 pt-3 flex items-center justify-between font-black text-xl text-slate-900"><span>Total</span><span>Rs. {total}</span></div>
            </div>

            <button
              className="btn-primary w-full mt-6 py-3 rounded-2xl text-sm font-black tracking-[0.08em]"
              onClick={() => navigate('/checkout')}
            >
              PROCEED TO CHECKOUT
            </button>

            <Link
              to="/products"
              className="mt-3 block text-center text-sm font-black tracking-wide text-slate-500 hover:text-slate-700"
            >
              CONTINUE SHOPPING
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Cart;
