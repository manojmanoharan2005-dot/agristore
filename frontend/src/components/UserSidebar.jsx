import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CircleUserRound, LocateFixed, Heart, Settings, Package, LogOut, ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const menuLinks = [
  { to: '/profile', label: 'MY PROFILE', icon: CircleUserRound },
  { to: '/my-orders', label: 'MY ORDERS', icon: Package },
  { to: '/cart', label: 'YOUR CART', icon: ShoppingCart }
];

const settingsLinks = [
  { to: '/addresses', label: 'SAVED ADDRESSES', icon: LocateFixed },
  { to: '/wishlist', label: 'WISHLIST', icon: Heart },
  { to: '/settings', label: 'SETTINGS', icon: Settings }
];

const UserSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const name = user?.name?.toUpperCase() || 'USER';
  const email = user?.email || '';

  const renderLink = (link) => {
    const isActive = location.pathname === link.to;
    const Icon = link.icon;

    return (
      <Link
        key={link.to}
        to={link.to}
        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-black tracking-wide transition-colors ${isActive ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
      >
        <span className={`h-8 w-8 rounded-xl grid place-items-center ${isActive ? 'bg-slate-800 text-emerald-400' : 'bg-slate-100 border border-slate-200 text-slate-500'}`}>
          <Icon size={16} />
        </span>
        {link.label}
      </Link>
    );
  };

  return (
    <aside className="space-y-6 lg:sticky lg:top-24">
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-slate-100 border border-slate-200 grid place-items-center text-slate-500">
            <CircleUserRound size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-[2rem] leading-none font-black text-slate-800 truncate">{name}</p>
            <p className="text-sm text-slate-400 mt-2 truncate">{email}</p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <p className="text-xs tracking-[0.2em] font-extrabold text-slate-300 mb-5">MENU</p>
        <nav className="space-y-2">{menuLinks.map(renderLink)}</nav>

        <p className="text-xs tracking-[0.2em] font-extrabold text-slate-300 mt-8 mb-5">SETTINGS</p>
        <nav className="space-y-2">{settingsLinks.map(renderLink)}</nav>

        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="w-full mt-4 text-left flex items-center gap-3 px-4 py-3.5 rounded-2xl text-rose-500 font-black tracking-wide hover:bg-rose-50 transition-colors"
        >
          <span className="h-8 w-8 rounded-xl bg-rose-100 border border-rose-200 grid place-items-center"><LogOut size={16} /></span>
          LOGOUT
        </button>
      </div>
    </aside>
  );
};

export default UserSidebar;
