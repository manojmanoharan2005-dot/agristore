import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Box,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  Layers,
  RefreshCw,
  ShieldAlert,
  Users,
  Wallet,
  X,
  LogOut,
  Home
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Box },
  { id: 'orders', label: 'Orders', icon: ClipboardList },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'categories', label: 'Categories', icon: Layers },
  { id: 'returns', label: 'Returns & Refunds', icon: RefreshCw },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 }
];

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100';
const cardClass = 'rounded-2xl border border-slate-200 bg-white shadow-sm';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [section, setSection] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [overview, setOverview] = useState({ stats: {}, recentOrders: [] });

  const [products, setProducts] = useState([]);
  const [productFilters, setProductFilters] = useState({ search: '', category: '', stockStatus: '' });
  const [productPage, setProductPage] = useState(1);
  const [productPagination, setProductPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [productForm, setProductForm] = useState({ name: '', description: '', category: '', price: '', imageUrl: '', stock: '' });
  const [editingProductId, setEditingProductId] = useState('');
  const [imageUploading, setImageUploading] = useState(false);

  const [orders, setOrders] = useState([]);
  const [orderFilters, setOrderFilters] = useState({ status: '', paymentStatus: '', startDate: '', endDate: '' });
  const [orderPage, setOrderPage] = useState(1);
  const [orderPagination, setOrderPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [adminCancelModal, setAdminCancelModal] = useState({ isOpen: false, orderId: null, status: 'cancelled', reason: '' });

  const [users, setUsers] = useState([]);
  const [userFilters, setUserFilters] = useState({ blocked: '' });
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  const [categories, setCategories] = useState([]);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [editingCategoryId, setEditingCategoryId] = useState('');

  const [returns, setReturns] = useState([]);
  const [returnFilters, setReturnFilters] = useState({ status: '', refundStatus: '' });
  const [newReturn, setNewReturn] = useState({ orderId: '', reason: '' });

  const [analyticsRange, setAnalyticsRange] = useState('daily');
  const [salesSeries, setSalesSeries] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  const topRevenue = useMemo(
    () => Math.max(1, ...salesSeries.map((s) => Number(s.revenue || 0))),
    [salesSeries]
  );

  const run = async (fn) => {
    try {
      setError('');
      setNotice('');
      setLoading(true);
      await fn();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Operation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const runWithNotice = (message, fn) => run(async () => {
    await fn();
    setNotice(message);
  });

  const loadOverview = async () => {
    const { data } = await api.get('/admin/overview');
    setOverview({ stats: data.stats || {}, recentOrders: data.recentOrders || [] });
  };

  const loadProducts = async (page = productPage) => {
    const { data } = await api.get('/admin/products', { params: { ...productFilters, page, limit: 12 } });
    setProducts(data.products || []);
    setProductPagination(data.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 });
    setProductPage(data.pagination?.page || page);
  };

  const loadOrders = async (page = orderPage) => {
    const { data } = await api.get('/admin/orders', { params: { ...orderFilters, page, limit: 12 } });
    setOrders(data.orders || []);
    setOrderPagination(data.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 });
    setOrderPage(data.pagination?.page || page);
  };

  const loadUsers = async (page = userPage, filters = userFilters) => {
    const { data } = await api.get('/admin/users', { params: { ...filters, page, limit: 12 } });
    setUsers(data.users || []);
    setUserPagination(data.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 });
    setUserPage(data.pagination?.page || page);
  };

  const loadCategories = async () => {
    const { data } = await api.get('/admin/categories');
    setCategories(data.categories || []);
  };

  const loadReturns = async () => {
    const { data } = await api.get('/admin/returns', { params: returnFilters });
    setReturns(data.requests || []);
  };

  const loadAnalytics = async () => {
    const [salesRes, topRes] = await Promise.all([
      api.get('/admin/analytics/sales', { params: { range: analyticsRange, days: 90 } }),
      api.get('/admin/analytics/top-products', { params: { limit: 8 } })
    ]);
    setSalesSeries(salesRes.data.sales || []);
    setTopProducts(topRes.data.topProducts || []);
  };

  useEffect(() => {
    run(async () => {
      const results = await Promise.allSettled([loadOverview(), loadProducts(1), loadOrders(1), loadUsers(1), loadCategories(), loadReturns(), loadAnalytics()]);
      const failed = results.filter((result) => result.status === 'rejected').length;
      if (failed) {
        setError(`Loaded with ${failed} module error(s). Open each tab and press Refresh.`);
      }
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sectionParam = params.get('section');

    if (sectionParam && navItems.some((item) => item.id === sectionParam)) {
      setSection(sectionParam);
    }

    if (sectionParam === 'users') {
      run(() => loadUsers(1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const refreshSection = () => run(async () => {
    if (section === 'overview') await loadOverview();
    if (section === 'products') await loadProducts();
    if (section === 'orders') await loadOrders();
    if (section === 'users') await loadUsers();
    if (section === 'categories') await loadCategories();
    if (section === 'returns') await loadReturns();
    if (section === 'analytics') await loadAnalytics();
  });

  const saveProduct = () => runWithNotice(editingProductId ? 'Product updated successfully.' : 'Product created successfully.', async () => {
    if (!productForm.name.trim() || !productForm.description.trim() || !productForm.category.trim()) {
      throw new Error('Name, description and category are required.');
    }
    if (Number(productForm.price) < 0 || Number(productForm.stock) < 0) {
      throw new Error('Price and stock must be zero or positive numbers.');
    }

    const payload = {
      ...productForm,
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      category: productForm.category.trim(),
      price: Number(productForm.price),
      stock: Number(productForm.stock)
    };
    if (editingProductId) await api.put(`/admin/products/${editingProductId}`, payload);
    else await api.post('/admin/products', payload);

    setProductForm({ name: '', description: '', category: '', price: '', imageUrl: '', stock: '' });
    setEditingProductId('');
    await loadProducts(productPage);
    await loadOverview();
  });

  const uploadProductImage = async (file) => {
    if (!file) return;
    try {
      setError('');
      setImageUploading(true);
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post('/admin/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProductForm((prev) => ({ ...prev, imageUrl: data.imageUrl || '' }));
      setNotice('Image uploaded from desktop successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Image upload failed.');
    } finally {
      setImageUploading(false);
    }
  };

  const removeProduct = (id) => {
    if (!window.confirm('Delete this product? This action cannot be undone.')) return;
    runWithNotice('Product deleted successfully.', async () => {
    await api.delete(`/admin/products/${id}`);
      await loadProducts(productPage);
      await loadOverview();
    });
  };

  const changeOrderStatus = (id, status) => {
    if (status === 'cancelled') {
        setAdminCancelModal({ isOpen: true, orderId: id, status, reason: '' });
        return;
    }
    
    runWithNotice(`Order status updated to ${status}.`, async () => {
      await api.patch(`/admin/orders/${id}/status`, { status });
      await loadOrders(orderPage);
      await loadOverview();
    });
  };

  const confirmAdminCancelOrder = () => runWithNotice(`Order status updated to ${adminCancelModal.status}.`, async () => {
      if (!adminCancelModal.reason.trim()) {
        throw new Error("A reason is required to cancel the order.");
      }
      
      await api.patch(`/admin/orders/${adminCancelModal.orderId}/status`, { 
        status: adminCancelModal.status, 
        reason: adminCancelModal.reason.trim() 
      });
      await loadOrders(orderPage);
      await loadOverview();
      setAdminCancelModal({ isOpen: false, orderId: null, status: 'cancelled', reason: '' });
  });

  const openOrderDetails = (id) => run(async () => {
    const { data } = await api.get(`/admin/orders/${id}`);
    setSelectedOrder(data.order || null);
  });

  const toggleBlock = (id, isBlocked) => runWithNotice(isBlocked ? 'User unblocked.' : 'User blocked.', async () => {
    await api.patch(`/admin/users/${id}/block`, { isBlocked: !isBlocked });
    await loadUsers(userPage);
  });

  const removeUser = (id) => {
    if (!window.confirm('Delete this user account? This action cannot be undone.')) return;
    runWithNotice('User deleted successfully.', async () => {
      await api.delete(`/admin/users/${id}`);
      await loadUsers(userPage);
      await loadOverview();
    });
  };

  const saveCategory = () => runWithNotice(editingCategoryId ? 'Category updated.' : 'Category created.', async () => {
    if (!categoryForm.name.trim()) {
      throw new Error('Category name is required.');
    }
    if (editingCategoryId) await api.put(`/admin/categories/${editingCategoryId}`, categoryForm);
    else await api.post('/admin/categories', categoryForm);
    setCategoryForm({ name: '', description: '' });
    setEditingCategoryId('');
    await loadCategories();
  });

  const removeCategory = (id) => {
    if (!window.confirm('Delete this category?')) return;
    runWithNotice('Category deleted.', async () => {
      await api.delete(`/admin/categories/${id}`);
      await loadCategories();
    });
  };

  const createReturn = () => runWithNotice('Return request created.', async () => {
    if (!newReturn.orderId.trim() || !newReturn.reason.trim()) {
      throw new Error('Order ID and reason are required to create a return request.');
    }
    await api.post('/admin/returns', newReturn);
    setNewReturn({ orderId: '', reason: '' });
    await loadReturns();
  });

  const decideReturn = (id, decision) => runWithNotice(`Return request ${decision}.`, async () => {
    await api.patch(`/admin/returns/${id}/decision`, { decision, adminNote: `Marked ${decision} by admin` });
    await loadReturns();
  });

  const markRefund = (id, refundStatus) => runWithNotice(`Refund marked as ${refundStatus}.`, async () => {
    await api.patch(`/admin/returns/${id}/refund`, { refundStatus, refundReference: `REF-${Date.now()}` });
    await loadReturns();
  });

  const Pager = ({ page, totalPages, onChange }) => (
    <div className="flex items-center justify-between mt-4 border-t border-slate-100 pt-3">
      <p className="text-xs text-slate-500 font-semibold">Page {page} of {Math.max(totalPages, 1)}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1 || loading}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages || loading}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-140px)] page-container py-6">
      <div className="grid lg:grid-cols-[270px_1fr] gap-6 items-start">
        <aside className={`${cardClass} p-4 lg:sticky lg:top-24`}>
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs tracking-[0.18em] font-extrabold text-slate-400">ADMIN PANEL</p>
            <h1 className="text-2xl font-black text-slate-900 mt-1">E-Commerce Control</h1>
          </div>
          <div className="mt-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Icon size={17} />
                  {item.label}
                </button>
              );
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
            <button onClick={() => { logout(); navigate('/login'); }} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors">
              <LogOut size={17} />
              Logout
            </button>
          </div>
        </aside>

        <main className="space-y-5">
          <div className={`${cardClass} p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between`}>
            <div>
              <p className="text-xs tracking-[0.16em] font-extrabold text-slate-400">ADMIN CONTROL CENTER</p>
              <h2 className="text-2xl font-black text-slate-900 capitalize mt-1">{navItems.find((n) => n.id === section)?.label}</h2>
            </div>
            <button onClick={refreshSection} className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-bold inline-flex items-center gap-2">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 p-4 text-sm font-semibold inline-flex items-center gap-2">
              <ShieldAlert size={16} /> {error}
            </div>
          )}

          {notice && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 p-4 text-sm font-semibold inline-flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{notice}</span>
              <button className="ml-2 text-emerald-700" onClick={() => setNotice('')}><X size={14} /></button>
            </div>
          )}

          {section === 'overview' && (
            <>
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className={`${cardClass} p-5`}><p className="text-xs text-slate-400 font-extrabold tracking-wide">TOTAL USERS</p><p className="text-3xl font-black mt-2">{overview.stats.totalUsers || 0}</p></div>
                <div className={`${cardClass} p-5`}><p className="text-xs text-slate-400 font-extrabold tracking-wide">TOTAL PRODUCTS</p><p className="text-3xl font-black mt-2">{overview.stats.totalProducts || 0}</p></div>
                <div className={`${cardClass} p-5`}><p className="text-xs text-slate-400 font-extrabold tracking-wide">TOTAL ORDERS</p><p className="text-3xl font-black mt-2">{overview.stats.totalOrders || 0}</p></div>
                <div className={`${cardClass} p-5`}><p className="text-xs text-slate-400 font-extrabold tracking-wide">TOTAL REVENUE</p><p className="text-3xl font-black mt-2">{money(overview.stats.totalRevenue)}</p></div>
              </div>

              <div className={`${cardClass} p-5 overflow-auto`}>
                <h3 className="text-lg font-black text-slate-900 mb-3">Recent Orders</h3>
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="py-2">Order</th><th>User</th><th>Items</th><th>Payment</th><th>Status</th><th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(overview.recentOrders || []).map((o) => (
                      <tr key={o._id} className="border-b border-slate-100">
                        <td className="py-2 font-semibold">#{o._id.slice(-8).toUpperCase()}</td>
                        <td>{o.userId?.name || 'User'}</td>
                        <td className="max-w-[200px] truncate" title={o.items?.map(i => i.name).join(', ')}>
                          {o.items?.length ? (o.items.length === 1 ? o.items[0].name : `${o.items[0].name} +${o.items.length - 1} more`) : '-'}
                        </td>
                        <td>{o.paymentStatus}</td>
                        <td className="capitalize">{o.status}</td>
                        <td className="text-right font-bold">{money(o.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {section === 'products' && (
            <div className="grid xl:grid-cols-[1fr_360px] gap-5">
              <div className={`${cardClass} p-5 space-y-4`}>
                <div className="grid md:grid-cols-3 gap-2">
                  <input className={inputClass} placeholder="Search products..." value={productFilters.search || ''} onChange={(e) => setProductFilters((s) => ({ ...s, search: e.target.value }))} />
                  <input className={inputClass} placeholder="Category" value={productFilters.category || ''} onChange={(e) => setProductFilters((s) => ({ ...s, category: e.target.value }))} />
                  <select className={inputClass} value={productFilters.stockStatus || ''} onChange={(e) => setProductFilters((s) => ({ ...s, stockStatus: e.target.value }))}>
                    <option value="">All Stock</option>
                    <option value="in">In Stock</option>
                    <option value="out">Out of Stock</option>
                  </select>
                </div>
                <button onClick={() => run(async () => { setProductPage(1); await loadProducts(1); })} className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-bold">Apply Filters / Search</button>

                <div className="overflow-auto">
                  <table className="w-full text-sm min-w-[860px]">
                    <thead><tr className="border-b border-slate-200 text-left text-slate-500"><th className="py-2">Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p._id} className="border-b border-slate-100">
                          <td className="py-2 font-semibold">{p.name}</td>
                          <td>{p.category}</td>
                          <td>{money(p.price)}</td>
                          <td>{p.stock}</td>
                          <td className={p.stock > 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{p.stock > 0 ? 'In Stock' : 'Out of Stock'}</td>
                          <td className="space-x-2">
                            <button className="text-slate-800 font-bold" onClick={() => {
                              setEditingProductId(p._id);
                              setProductForm({
                                name: p.name || '',
                                description: p.description || '',
                                category: p.category || '',
                                price: p.price || '',
                                imageUrl: p.imageUrl || '',
                                stock: p.stock || ''
                              });
                            }}>Edit</button>
                            <button className="text-rose-600 font-bold" onClick={() => removeProduct(p._id)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Pager page={productPagination.page || productPage} totalPages={productPagination.totalPages || 1} onChange={(nextPage) => run(() => loadProducts(nextPage))} />
              </div>

              <div className={`${cardClass} p-5 space-y-3`}>
                <h3 className="text-lg font-black text-slate-900">{editingProductId ? 'Edit Product' : 'Add Product'}</h3>
                <input className={inputClass} placeholder="Name" value={productForm.name} onChange={(e) => setProductForm((s) => ({ ...s, name: e.target.value }))} />
                <textarea className={inputClass} rows={4} placeholder="Description" value={productForm.description} onChange={(e) => setProductForm((s) => ({ ...s, description: e.target.value }))} />
                <input className={inputClass} placeholder="Category" value={productForm.category} onChange={(e) => setProductForm((s) => ({ ...s, category: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputClass} type="number" placeholder="Price" value={productForm.price} onChange={(e) => setProductForm((s) => ({ ...s, price: e.target.value }))} />
                  <input className={inputClass} type="number" placeholder="Stock" value={productForm.stock} onChange={(e) => setProductForm((s) => ({ ...s, stock: e.target.value }))} />
                </div>
                <input className={inputClass} placeholder="Image URL" value={productForm.imageUrl} onChange={(e) => setProductForm((s) => ({ ...s, imageUrl: e.target.value }))} />
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-500 mb-2">Upload product image from desktop</p>
                  <input
                    type="file"
                    accept="image/*"
                    className="text-xs"
                    onChange={(e) => uploadProductImage(e.target.files?.[0])}
                    disabled={imageUploading}
                  />
                  {imageUploading && <p className="text-xs text-slate-500 mt-2">Uploading image...</p>}
                </div>
                {productForm.imageUrl ? (
                  <div className="relative rounded-xl border border-slate-200 p-2 bg-white">
                    <img src={productForm.imageUrl} alt="Preview" className="h-28 w-full object-contain rounded-lg" />
                    <button
                      type="button"
                      onClick={() => setProductForm((s) => ({ ...s, imageUrl: '' }))}
                      className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-md transition-colors"
                      title="Remove image"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : null}
                <button onClick={saveProduct} className="w-full rounded-xl bg-emerald-500 text-white py-2.5 font-bold">{editingProductId ? 'Update Product' : 'Create Product'}</button>
                {editingProductId && <button onClick={() => { setEditingProductId(''); setProductForm({ name: '', description: '', category: '', price: '', imageUrl: '', stock: '' }); }} className="w-full rounded-xl border border-slate-200 py-2.5 font-bold text-slate-600">Cancel Edit</button>}
              </div>
            </div>
          )}

          {section === 'orders' && (
            <div className={`${cardClass} p-5 space-y-4`}>
              <div className="grid md:grid-cols-4 gap-2">
                <select className={inputClass} value={orderFilters.status} onChange={(e) => setOrderFilters((s) => ({ ...s, status: e.target.value }))}>
                  <option value="">All Status</option>
                  {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className={inputClass} value={orderFilters.paymentStatus} onChange={(e) => setOrderFilters((s) => ({ ...s, paymentStatus: e.target.value }))}>
                  <option value="">All Payments</option>
                  {['pending', 'paid', 'failed'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input className={inputClass} type="date" value={orderFilters.startDate} onChange={(e) => setOrderFilters((s) => ({ ...s, startDate: e.target.value }))} />
                <input className={inputClass} type="date" value={orderFilters.endDate} onChange={(e) => setOrderFilters((s) => ({ ...s, endDate: e.target.value }))} />
              </div>
              <button onClick={() => run(async () => { setOrderPage(1); await loadOrders(1); })} className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-bold">Apply Filters</button>

              <div className="overflow-auto">
                <table className="w-full text-sm min-w-[980px]">
                  <thead><tr className="border-b border-slate-200 text-left text-slate-500"><th className="py-2">Order</th><th>User</th><th>Items</th><th>Payment</th><th>Status</th><th>Amount</th><th>Date</th><th>Actions</th></tr></thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o._id} className="border-b border-slate-100">
                        <td className="py-2 font-semibold">#{o._id.slice(-8).toUpperCase()}</td>
                        <td>{o.userId?.name || 'User'}</td>
                        <td className="max-w-[200px] truncate" title={o.items?.map(i => i.name).join(', ')}>
                          {o.items?.length ? (o.items.length === 1 ? o.items[0].name : `${o.items[0].name} +${o.items.length - 1} more`) : '-'}
                        </td>
                        <td className="capitalize">
                          {o.paymentStatus}
                          {o.status === 'cancelled' && o.refundStatus && o.refundStatus !== 'none' && (
                            <div className="mt-1">
                              <span className="text-[10px] font-bold uppercase tracking-wide bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                                Refund: <span className={o.refundStatus === 'processed' ? 'text-emerald-600' : (o.refundStatus === 'failed' ? 'text-rose-600' : 'text-amber-600')}>{o.refundStatus}</span>
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          <select className="rounded-lg border border-slate-200 px-2 py-1 text-xs" value={o.status} onChange={(e) => changeOrderStatus(o._id, e.target.value)}>
                            {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="font-bold">{money(o.totalAmount)}</td>
                        <td>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                        <td><button className="text-slate-800 font-bold" onClick={() => openOrderDetails(o._id)}>View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pager page={orderPagination.page || orderPage} totalPages={orderPagination.totalPages || 1} onChange={(nextPage) => run(() => loadOrders(nextPage))} />

              {selectedOrder && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-black text-slate-900">Order Detail #{selectedOrder._id.slice(-8).toUpperCase()}</h4>
                    <button className="text-xs font-bold text-slate-500" onClick={() => setSelectedOrder(null)}>Close</button>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{selectedOrder.userId?.name} • {selectedOrder.userId?.email} • {selectedOrder.userId?.phone || '-'}</p>
                  <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
                    {(selectedOrder.items || []).map((item, idx) => (
                      <div key={`${item.productId?._id || item.productId || idx}`} className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="font-bold">{item.name}</p>
                        <p className="text-slate-500">Qty: {item.quantity} • Price: {money(item.price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {section === 'users' && (
            <div className={`${cardClass} p-5 space-y-4`}>
              <div className="grid md:grid-cols-2 gap-2">
                <select className={inputClass} value={userFilters.blocked} onChange={(e) => setUserFilters((s) => ({ ...s, blocked: e.target.value }))}>
                  <option value="">All Users</option>
                  <option value="true">Blocked</option>
                  <option value="false">Active</option>
                </select>
                <button
                  onClick={() => run(async () => {
                    setUserPage(1);
                    await loadUsers(1);
                  })}
                  className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-bold"
                >
                  Apply Filters
                </button>
              </div>

              <div className="overflow-auto">
                <table className="w-full text-sm min-w-[760px]">
                  <thead><tr className="border-b border-slate-200 text-left text-slate-500"><th className="py-2">Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} className="border-b border-slate-100">
                        <td className="py-2 font-semibold">{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.phone || '-'}</td>
                        <td className={u.isBlocked ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>{u.isBlocked ? 'Blocked' : 'Active'}</td>
                        <td className="space-x-2">
                          <button className="text-slate-800 font-bold" onClick={() => toggleBlock(u._id, u.isBlocked)}>{u.isBlocked ? 'Unblock' : 'Block'}</button>
                          <button className="text-rose-600 font-bold" onClick={() => removeUser(u._id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pager page={userPagination.page || userPage} totalPages={userPagination.totalPages || 1} onChange={(nextPage) => run(() => loadUsers(nextPage))} />
            </div>
          )}

          {section === 'categories' && (
            <div className="grid lg:grid-cols-[1fr_360px] gap-5">
              <div className={`${cardClass} p-5 overflow-auto`}>
                <table className="w-full text-sm min-w-[640px]">
                  <thead><tr className="border-b border-slate-200 text-left text-slate-500"><th className="py-2">Name</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c._id} className="border-b border-slate-100">
                        <td className="py-2 font-semibold">{c.name}</td>
                        <td>{c.description || '-'}</td>
                        <td className={c.isActive ? 'text-emerald-600 font-bold' : 'text-slate-500 font-bold'}>{c.isActive ? 'Active' : 'Inactive'}</td>
                        <td className="space-x-2">
                          <button className="text-slate-800 font-bold" onClick={() => {
                            setEditingCategoryId(c._id);
                            setCategoryForm({ name: c.name || '', description: c.description || '' });
                          }}>Edit</button>
                          <button className="text-rose-600 font-bold" onClick={() => removeCategory(c._id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={`${cardClass} p-5 space-y-3`}>
                <h3 className="text-lg font-black text-slate-900">{editingCategoryId ? 'Edit Category' : 'Add Category'}</h3>
                <input className={inputClass} placeholder="Category Name" value={categoryForm.name} onChange={(e) => setCategoryForm((s) => ({ ...s, name: e.target.value }))} />
                <textarea className={inputClass} rows={5} placeholder="Description" value={categoryForm.description} onChange={(e) => setCategoryForm((s) => ({ ...s, description: e.target.value }))} />
                <button className="w-full rounded-xl bg-emerald-500 text-white py-2.5 font-bold" onClick={saveCategory}>{editingCategoryId ? 'Update Category' : 'Create Category'}</button>
                {editingCategoryId && <button className="w-full rounded-xl border border-slate-200 py-2.5 font-bold text-slate-600" onClick={() => { setEditingCategoryId(''); setCategoryForm({ name: '', description: '' }); }}>Cancel</button>}
              </div>
            </div>
          )}

          {section === 'returns' && (
            <div className="grid xl:grid-cols-[1fr_360px] gap-5">
              <div className={`${cardClass} p-5 space-y-4`}>
                <div className="grid md:grid-cols-3 gap-2">
                  <select className={inputClass} value={returnFilters.status} onChange={(e) => setReturnFilters((s) => ({ ...s, status: e.target.value }))}>
                    <option value="">All Decisions</option>
                    {['requested', 'approved', 'rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select className={inputClass} value={returnFilters.refundStatus} onChange={(e) => setReturnFilters((s) => ({ ...s, refundStatus: e.target.value }))}>
                    <option value="">All Refund</option>
                    {['none', 'pending', 'processed', 'failed'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-bold" onClick={() => run(loadReturns)}>Apply Filters</button>
                </div>

                <div className="space-y-3">
                  {returns.map((r) => (
                    <div key={r._id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-black text-slate-900">Return #{r._id.slice(-8).toUpperCase()}</p>
                        <p className="text-xs font-bold uppercase text-slate-500">{r.status} / {r.refundStatus}</p>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">Order: #{r.orderId?._id?.toString().slice(-8).toUpperCase() || 'NA'} • User: {r.userId?.name || 'User'}</p>
                      <p className="text-sm text-slate-500 mt-2">Reason: {r.reason || '-'}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.status === 'requested' && (
                          <>
                            <button className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700" onClick={() => decideReturn(r._id, 'approved')}>Approve</button>
                            <button className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700" onClick={() => decideReturn(r._id, 'rejected')}>Reject</button>
                          </>
                        )}
                        {r.status === 'approved' && r.refundStatus !== 'processed' && (
                          <>
                            {r.refundStatus !== 'pending' && <button className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700" onClick={() => markRefund(r._id, 'pending')}>Refund Pending</button>}
                            <button className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700" onClick={() => markRefund(r._id, 'processed')}>Process Refund</button>
                            <button className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700" onClick={() => markRefund(r._id, 'failed')}>Mark Refund Failed</button>
                          </>
                        )}
                        {r.refundStatus === 'processed' && (
                          <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">✅ Refunded</span>
                        )}
                        {r.status === 'rejected' && (
                          <span className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">❌ Rejected</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${cardClass} p-5 space-y-3`}>
                <h3 className="text-lg font-black text-slate-900">Create Return Request</h3>
                <input className={inputClass} placeholder="Order ID" value={newReturn.orderId} onChange={(e) => setNewReturn((s) => ({ ...s, orderId: e.target.value }))} />
                <textarea className={inputClass} rows={5} placeholder="Reason" value={newReturn.reason} onChange={(e) => setNewReturn((s) => ({ ...s, reason: e.target.value }))} />
                <button onClick={createReturn} className="w-full rounded-xl bg-slate-900 text-white py-2.5 font-bold">Create Request</button>
              </div>
            </div>
          )}

          {section === 'analytics' && (
            <div className="grid xl:grid-cols-[1.3fr_1fr] gap-5">
              <div className={`${cardClass} p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-slate-900">Sales Report</h3>
                  <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                    {['daily', 'weekly', 'monthly'].map((r) => (
                      <button key={r} onClick={() => run(async () => { setAnalyticsRange(r); const { data } = await api.get('/admin/analytics/sales', { params: { range: r, days: 90 } }); setSalesSeries(data.sales || []); })} className={`px-3 py-1.5 rounded-md text-xs font-bold ${analyticsRange === r ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 max-h-[430px] overflow-auto pr-2">
                  {salesSeries.map((point) => (
                    <div key={point._id}>
                      <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                        <span>{point._id}</span>
                        <span>{money(point.revenue)} • {point.orders} orders</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.max(4, (Number(point.revenue || 0) / topRevenue) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${cardClass} p-5`}>
                <h3 className="text-lg font-black text-slate-900 mb-4">Top Selling Products</h3>
                <div className="space-y-3">
                  {topProducts.map((p, idx) => (
                    <div key={`${p._id || p.name}-${idx}`} className="rounded-xl border border-slate-200 p-3">
                      <p className="font-black text-slate-900">{idx + 1}. {p.name || 'Product'}</p>
                      <p className="text-sm text-slate-500 mt-1">Sold: {p.quantitySold} units</p>
                      <p className="text-sm font-bold text-emerald-600 mt-1">Revenue: {money(p.revenue)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {loading && <p className="text-sm font-semibold text-slate-500 inline-flex items-center gap-2"><RefreshCw size={14} className="animate-spin" /> Loading...</p>}
        </main>
      </div>

      <footer className="mt-8 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 flex items-start gap-3">
        <Wallet className="text-slate-400" size={18} />
        <p>
          Secure admin module with JWT-protected routes, role checks, validation-friendly APIs, and separate operational sections for products, users, orders, categories, analytics, and refunds.
        </p>
      </footer>

      {adminCancelModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl border border-slate-200">
            <h3 className="text-2xl font-black text-slate-900 mb-2">Cancel Order</h3>
            <p className="text-slate-500 mb-6 font-medium tracking-wide text-sm">Please provide a reason for cancelling this order.</p>
            <textarea
              className="w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50 min-h-[120px] text-slate-700 font-medium mb-6 resize-none transition-all transition-colors"
              placeholder="e.g. Cancelled upon customer request..."
              value={adminCancelModal.reason}
              onChange={(e) => setAdminCancelModal(prev => ({ ...prev, reason: e.target.value }))}
            />
            <div className="flex gap-4 justify-end">
              <button
                className="px-6 py-3 rounded-2xl font-bold tracking-wide text-slate-500 hover:bg-slate-100 transition-colors"
                onClick={() => {
                  setAdminCancelModal({ isOpen: false, orderId: null, status: 'cancelled', reason: '' });
                  loadOrders(orderPage); // Reload to reset the dropdown visually
                }}
              >
                Go Back
              </button>
              <button
                className="px-6 py-3 rounded-2xl font-black tracking-wide bg-rose-500 text-white hover:bg-rose-600 shadow-xl shadow-rose-200 transition-all active:scale-95"
                onClick={confirmAdminCancelOrder}
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

export default AdminDashboard;
