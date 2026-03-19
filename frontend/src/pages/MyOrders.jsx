import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CircleUserRound,
  Download,
  LocateFixed,
  LogOut,
  Package,
  Search,
  Sparkles
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const timelineSteps = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
const ORDERS_CACHE_KEY = 'agristore_my_orders_cache_v1';

const statusText = {
  pending: 'PENDING',
  confirmed: 'CONFIRMED',
  processing: 'PROCESSING',
  shipped: 'SHIPPED',
  delivered: 'DELIVERED',
  cancelled: 'CANCELLED'
};

const MyOrders = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState({ isOpen: false, orderId: null, reason: '' });

  const userName = user?.name?.toUpperCase() || 'USER';
  const userEmail = user?.email || '';

  useEffect(() => {
    const load = async () => {
      try {
        const cached = localStorage.getItem(ORDERS_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setOrders(parsed);
            setLoading(false);
          }
        }
      } catch {
        // Ignore invalid cache payloads and fallback to network.
      }

      try {
        const { data } = await api.get('/orders/my-orders');
        const nextOrders = data.orders || [];
        setOrders(nextOrders);
        localStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(nextOrders));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openCancelModal = (id) => {
    setCancelModal({ isOpen: true, orderId: id, reason: '' });
  };

  const confirmCancelOrder = async () => {
    if (!cancelModal.reason.trim()) {
      alert("A reason is required to cancel the order.");
      return;
    }
    
    try {
      await api.patch(`/orders/${cancelModal.orderId}/cancel`, { reason: cancelModal.reason.trim() });
      setOrders(prev => prev.map(o => o._id === cancelModal.orderId ? { ...o, status: 'cancelled' } : o));
      setCancelModal({ isOpen: false, orderId: null, reason: '' });
    } catch (err) {
      alert('Failed to cancel order: ' + (err.response?.data?.message || err.message));
    }
  };

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;

    return orders.filter((order) => {
      const idMatch = order._id?.toLowerCase().includes(q);
      const productMatch = order.items?.some((item) => item.name?.toLowerCase().includes(q));
      return idMatch || productMatch;
    });
  }, [orders, query]);

  const canCancel = (status) => ['pending', 'confirmed', 'processing'].includes(status);

  const downloadInvoice = async (orderId) => {
    try {
      const { data } = await api.get(`/orders/${orderId}/invoice`, { responseType: 'text' });
      const blob = new Blob([data], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `AgriStore-Invoice-${orderId.slice(-8).toUpperCase()}.html`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      }

      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      alert('Could not download invoice right now. Please try again.');
    }
  };

  const getStepIndex = (status) => {
    if (status === 'cancelled') return -1;
    const idx = timelineSteps.indexOf(status);
    return idx >= 0 ? idx : 0;
  };

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('en-IN');
  };

  return (
    <div className="page-container py-8">
      <div className="grid lg:grid-cols-[320px_1fr] gap-6 items-start">
        <aside className="space-y-6 lg:sticky lg:top-24">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 border border-slate-200 grid place-items-center text-slate-500">
                <CircleUserRound size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-[2rem] font-black leading-none text-slate-800 truncate">{userName}</p>
                <p className="text-sm text-slate-400 mt-2 truncate">{userEmail}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <p className="text-xs tracking-[0.2em] font-extrabold text-slate-300 mb-5">MENU</p>
            <div className="space-y-2">
              <Link to="/profile" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 font-bold hover:bg-slate-50">
                <span className="h-8 w-8 rounded-xl bg-slate-100 border border-slate-200 grid place-items-center"><CircleUserRound size={16} /></span>
                MY PROFILE
              </Link>
              <div className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-slate-900 text-white font-black shadow-lg">
                <span className="h-8 w-8 rounded-xl bg-slate-800 grid place-items-center text-emerald-400"><Package size={16} /></span>
                MY ORDERS
              </div>
            </div>

            <p className="text-xs tracking-[0.2em] font-extrabold text-slate-300 mt-8 mb-5">SETTINGS</p>
            <div className="space-y-2">
              <Link to="/addresses" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 font-bold hover:bg-slate-50">
                <span className="h-8 w-8 rounded-xl bg-slate-100 border border-slate-200 grid place-items-center"><LocateFixed size={16} /></span>
                SAVED ADDRESSES
              </Link>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-500 font-black hover:bg-rose-50 text-left"
              >
                <span className="h-8 w-8 rounded-xl bg-rose-100 border border-rose-200 grid place-items-center"><LogOut size={16} /></span>
                LOGOUT
              </button>
            </div>
          </div>
        </aside>

        <section className="space-y-5">
          <div className="card p-2 flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 border border-slate-200 grid place-items-center text-slate-400">
              <Search size={20} />
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your orders or specific products..."
              className="flex-1 bg-transparent outline-none text-slate-500 placeholder:text-slate-300 font-semibold"
            />
            <button className="btn-secondary px-10 py-3 rounded-full text-sm tracking-[0.12em]">SEARCH</button>
          </div>

          {loading ? (
            <div className="card p-14 text-center text-slate-400 font-bold">Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="card p-14 text-center text-slate-400 font-bold">No orders found.</div>
          ) : filteredOrders.map((order) => {
            const firstItem = order.items?.[0];
            const extraItems = Math.max((order.items?.length || 0) - 1, 0);
            const statusIndex = getStepIndex(order.status);

            return (
              <div key={order._id} className="card overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="h-10 w-10 rounded-xl border border-slate-200 bg-slate-50 grid place-items-center text-emerald-500">
                      <Sparkles size={18} />
                    </span>
                    <div>
                      <p className="text-xs tracking-[0.12em] font-extrabold text-slate-400">ORDER ID</p>
                      <p className="font-black text-slate-800">#{order._id.slice(-8).toUpperCase()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs tracking-[0.12em] font-extrabold text-slate-400">TOTAL AMOUNT</p>
                      <p className="font-black text-[2rem] leading-none text-slate-900">Rs{order.totalAmount}</p>
                    </div>
                    <button
                      className="h-10 w-10 rounded-xl border border-slate-200 bg-slate-50 grid place-items-center text-slate-500"
                      onClick={() => downloadInvoice(order._id)}
                      title="Download invoice"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>

                <div className="p-6 grid lg:grid-cols-[1fr_320px] gap-6 items-start">
                  <div className="flex items-center gap-5">
                    <div className="h-24 w-24 rounded-3xl bg-slate-100 border border-slate-200" />
                    <div>
                      <p className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold tracking-wide text-slate-400">
                        CATEGORY: GENERAL
                      </p>
                      <p className="mt-3 text-[2rem] leading-none font-black italic text-slate-800">
                        {firstItem?.name || 'Order Item'}
                      </p>
                      <p className="mt-3 text-sm font-extrabold text-slate-400 tracking-[0.08em]">
                        QTY: {firstItem?.quantity || 0}
                        <span className="mx-3 text-slate-300">.</span>
                        PRICE: Rs{firstItem?.price || 0}
                      </p>
                      {extraItems > 0 && (
                        <p className="text-sm text-slate-400 mt-2">+{extraItems} more item(s)</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-3">
                      <span className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-100 text-amber-500 grid place-items-center">
                        <Package size={16} />
                      </span>
                      <div>
                        <p className="text-amber-500 font-black tracking-[0.08em]">{statusText[order.status] || order.status}</p>
                        <p className="text-sm text-slate-400">Updated {formatDate(order.updatedAt || order.createdAt)}</p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="relative h-2 bg-slate-200 rounded-full">
                        {timelineSteps.map((step, idx) => {
                          const active = statusIndex >= idx;
                          const left = `${(idx / (timelineSteps.length - 1)) * 100}%`;
                          return (
                            <span
                              key={step}
                              className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 ${active ? 'bg-emerald-400 border-emerald-400' : 'bg-white border-slate-300'}`}
                              style={{ left }}
                            />
                          );
                        })}
                      </div>
                      <div className="mt-3 flex justify-between text-[10px] font-extrabold tracking-wide text-slate-400">
                        {timelineSteps.map((step) => <span key={step}>{statusText[step]}</span>)}
                      </div>
                    </div>

                    {canCancel(order.status) && (
                      <div className="mt-6 text-right">
                        <button
                          className="text-rose-500 font-black tracking-[0.12em] text-sm"
                          onClick={() => openCancelModal(order._id)}
                        >
                          CANCEL ORDER
                        </button>
                      </div>
                    )}

                    {order.status === 'cancelled' && order.refundStatus && order.refundStatus !== 'none' && (
                      <div className={`mt-6 p-4 rounded-2xl border text-sm ${
                        order.refundStatus === 'processed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 
                        order.refundStatus === 'failed' ? 'border-rose-200 bg-rose-50 text-rose-700' :
                        'border-amber-200 bg-amber-50 text-amber-700'
                      }`}>
                        <p className="font-black mb-1 text-xs tracking-[0.08em]">REFUND {order.refundStatus.toUpperCase()}</p>
                        {order.refundStatus === 'pending' && <p className="font-medium opacity-90">Your refund is being processed by the seller. Once initiated, it typically takes 5-7 business days to reflect in your original payment method.</p>}
                        {order.refundStatus === 'processed' && <p className="font-medium opacity-90">Your refund has been accepted and processed by our gateway! Please allow 5-7 business days for the money to be credited to your bank account.</p>}
                        {order.refundStatus === 'failed' && <p className="font-medium opacity-90">We encountered an issue rolling back your payment. Our support team will resolve this manually.</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {cancelModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl border border-slate-200">
            <h3 className="text-2xl font-black text-slate-900 mb-2">Cancel Order</h3>
            <p className="text-slate-500 mb-6 font-medium tracking-wide text-sm">Please let us know why you are cancelling this order.</p>
            <textarea
              className="w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50 min-h-[120px] text-slate-700 font-medium mb-6 resize-none transition-all transition-colors"
              placeholder="e.g. I changed my mind, found a better price elsewhere..."
              value={cancelModal.reason}
              onChange={(e) => setCancelModal(prev => ({ ...prev, reason: e.target.value }))}
            />
            <div className="flex gap-4 justify-end">
              <button
                className="px-6 py-3 rounded-2xl font-bold tracking-wide text-slate-500 hover:bg-slate-100 transition-colors"
                onClick={() => setCancelModal({ isOpen: false, orderId: null, reason: '' })}
              >
                Keep Order
              </button>
              <button
                className="px-6 py-3 rounded-2xl font-black tracking-wide bg-rose-500 text-white hover:bg-rose-600 shadow-xl shadow-rose-200 transition-all active:scale-95"
                onClick={confirmCancelOrder}
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrders;
