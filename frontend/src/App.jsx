import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import MyOrders from './pages/MyOrders';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Addresses from './pages/Addresses';
import Wishlist from './pages/Wishlist';
import AdminDashboard from './pages/AdminDashboard';
import Header from './components/Header';
import NotificationTicker from './components/NotificationTicker';

import './App.css';

const ProtectedRoute = ({ children, adminOnly, userOnly }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTo)}`} replace />;
  }
  if (userOnly && isAdmin) return <Navigate to="/admin" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/products" replace />;

  return children;
};

const AppLayout = () => {
  const location = useLocation();
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const hideHeader = ['/login', '/register'].includes(location.pathname) || isAdminRoute;

  if (!loading && isAuthenticated && isAdmin && !isAdminRoute) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <>
      {!hideHeader && <Header />}
      {!hideHeader && <NotificationTicker />}
      <Routes>
        {/* Public */}
        <Route path="/" element={<Navigate to="/products" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />

        {/* Farmer (authenticated, non-admin) */}
        <Route path="/cart" element={
          <ProtectedRoute userOnly>
            <Cart />
          </ProtectedRoute>
        } />
        <Route path="/checkout" element={
          <ProtectedRoute userOnly>
            <Checkout />
          </ProtectedRoute>
        } />
        <Route path="/my-orders" element={
          <ProtectedRoute userOnly>
            <MyOrders />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute userOnly>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute userOnly>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/addresses" element={
          <ProtectedRoute userOnly>
            <Addresses />
          </ProtectedRoute>
        } />
        <Route path="/wishlist" element={
          <ProtectedRoute userOnly>
            <Wishlist />
          </ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
