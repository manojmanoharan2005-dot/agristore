import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Sprout } from 'lucide-react';

const AuthHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="bg-white/95 backdrop-blur-sm py-3 border-b border-slate-200/60 shrink-0">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-[#121722] shrink-0 hover:opacity-80 transition-opacity"
        >
          <Sprout className="text-emerald-500" size={22} />
          <div className="leading-none">
            <p className="font-extrabold text-xl tracking-tight">AgriStore</p>
            <p className="text-[9px] text-slate-400 font-semibold tracking-[0.2em]">PREMIUM QUALITY</p>
          </div>
        </button>
        <div className="hidden md:flex flex-1 items-center bg-slate-100 rounded-xl px-3 py-2.5 max-w-xl border border-slate-200">
          <Search size={16} className="text-gray-400 mr-2 shrink-0" />
          <input placeholder="Search premium products..." className="bg-transparent outline-none text-sm w-full placeholder:text-gray-400" />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={() => navigate('/login')} className="border border-slate-300 text-slate-700 text-sm font-semibold px-5 py-2 rounded-xl bg-white hover:bg-slate-50 transition-colors">
            Sign In
          </button>
          <button onClick={() => navigate('/products')} className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 inline-flex items-center justify-center hover:bg-slate-200 transition-colors border border-slate-200">
            <ShoppingCart size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default AuthHeader;
