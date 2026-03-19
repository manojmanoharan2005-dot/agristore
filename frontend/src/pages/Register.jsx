import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import ErrorToast from '../components/ErrorToast';
import AuthHeader from '../components/AuthHeader';
import authFarmIllustration from '../assets/auth-farm-illustration.svg';

const Register = () => {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    pincode: '',
    district: '',
    state: ''
  });
  const [error, setError] = useState('');
  const [showLoginSuggestion, setShowLoginSuggestion] = useState(false);
  const [postalError, setPostalError] = useState('');
  const [postalLoading, setPostalLoading] = useState(false);

  const fetchPostalDetails = async (pincode) => {
    if (!/^\d{6}$/.test(pincode)) return;

    setPostalLoading(true);
    setPostalError('');
    try {
      const { data } = await api.get(`/auth/pincode/${pincode}`);
      setForm((prev) => ({
        ...prev,
        district: data?.district || '',
        state: data?.state || ''
      }));
    } catch (err) {
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const raw = await response.json();
        const result = raw?.[0];
        const postOffice = result?.PostOffice?.[0];
        if (result?.Status === 'Success' && postOffice) {
          setForm((prev) => ({
            ...prev,
            district: postOffice.District || '',
            state: postOffice.State || ''
          }));
          setPostalError('');
          return;
        }
      } catch {
        // ignore and show manual fallback message below
      }

      setForm((prev) => ({ ...prev, district: '', state: '' }));
      const message = err?.response?.data?.message || 'Postal lookup unavailable. Please enter district and state manually.';
      setPostalError(message);
    } finally {
      setPostalLoading(false);
    }
  };

  useEffect(() => {
    if (form.pincode.length === 6) {
      fetchPostalDetails(form.pincode);
    }
    if (form.pincode.length < 6) {
      setPostalError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.pincode]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShowLoginSuggestion(false);

    const cleanedPhone = form.phone.trim();
    if (!/^\d{10}$/.test(cleanedPhone)) {
      setError('Enter a valid 10 digit mobile number.');
      return;
    }

    if (form.password.length < 8 || !/\d/.test(form.password)) {
      setError('Password must be at least 8 characters and contain at least 1 number.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Password and Confirm Password must match.');
      return;
    }

    if (!form.district.trim() || !form.state.trim()) {
      setError('District and state are required. Use pincode lookup or enter manually.');
      return;
    }

    const payload = {
      name: form.name,
      email: form.email,
      password: form.password,
      address: {
        district: form.district,
        city: form.district,
        state: form.state,
        pincode: form.pincode
      }
    };

    if (cleanedPhone.length > 0) payload.phone = cleanedPhone;

    const result = await register(payload);
    if (!result.success) {
      const message = result.message || 'Registration failed';
      setError(message);
      if (/already registered|already exists|email exists/i.test(message)) {
        setShowLoginSuggestion(true);
      }
      return;
    }
    navigate('/products');
  };

  const inputCls = 'w-full bg-white border border-slate-300 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-sm text-slate-700 placeholder:text-slate-400';

  return (
    <div className="min-h-screen bg-[#eef1f5] flex flex-col">
      <ErrorToast message={error} onClose={() => setError('')} />
      <AuthHeader />

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-5xl rounded-3xl border border-slate-200 shadow-xl overflow-hidden bg-white">
          <div className="grid md:grid-cols-[42%_58%]">
            <div className="bg-[linear-gradient(165deg,#f8fafc_0%,#f1f5f9_50%,#ffffff_100%)] p-8 sm:p-10 text-slate-800 flex flex-col border-r border-slate-200">
              <p className="text-xs tracking-[0.2em] font-extrabold text-slate-400">CREATE ACCOUNT</p>
              <h1 className="text-4xl font-extrabold mt-3 mb-4">Register</h1>
              <p className="text-base text-slate-600 leading-7 max-w-xs">
                Join AgriStore for faster checkout, order tracking and smart recommendations.
              </p>
              <div className="mt-auto pt-10">
                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <img
                    src={authFarmIllustration}
                    alt="AgriStore"
                    className="h-44 w-full object-cover rounded-lg opacity-90"
                  />
                </div>
              </div>
            </div>

            <form onSubmit={onSubmit} className="p-7 sm:p-10 bg-white">
              <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Create your account</h2>
              <p className="text-sm text-slate-400 mb-5">Set up your farmer account in a minute.</p>
              <div className="space-y-3">
                <input className={inputCls} placeholder="Full Name" value={form.name} onChange={(e) => setForm(v => ({ ...v, name: e.target.value }))} required />
                <input className={inputCls} type="email" placeholder="Email address" value={form.email} onChange={(e) => setForm(v => ({ ...v, email: e.target.value }))} required />
                <input className={inputCls} placeholder="Phone number" value={form.phone} onChange={(e) => setForm(v => ({ ...v, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} required />
                <input className={inputCls} type="password" placeholder="Password (min 8 chars, 1 number)" value={form.password} onChange={(e) => setForm(v => ({ ...v, password: e.target.value }))} required />
                <input className={inputCls} type="password" placeholder="Confirm Password" value={form.confirmPassword} onChange={(e) => setForm(v => ({ ...v, confirmPassword: e.target.value }))} required />
                <input
                  className={inputCls}
                  placeholder="Pincode"
                  value={form.pincode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setForm(v => ({ ...v, pincode: value }));
                  }}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <input className={inputCls} placeholder="District" value={form.district} onChange={(e) => setForm(v => ({ ...v, district: e.target.value }))} required />
                  <input className={inputCls} placeholder="State" value={form.state} onChange={(e) => setForm(v => ({ ...v, state: e.target.value }))} required />
                </div>
              </div>

              {postalLoading && <p className="text-slate-500 text-xs mt-3 flex items-center gap-1"><span className="inline-block w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />Fetching location details...</p>}
              {postalError && <p className="text-orange-500 text-xs mt-3">{postalError}</p>}
              {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
              {showLoginSuggestion && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-emerald-700">This email is already registered. Sign in instead.</p>
                  <button
                    type="button"
                    onClick={() => navigate(`/login?email=${encodeURIComponent(form.email.trim())}`)}
                    className="text-xs font-bold text-slate-700 hover:text-emerald-600 transition-colors"
                  >
                    Go to Sign in
                  </button>
                </div>
              )}

              <button
                disabled={loading}
                className="w-full mt-5 bg-slate-900 hover:bg-black text-white font-bold tracking-widest py-3.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {loading ? 'CREATING ACCOUNT...' : 'REGISTER'}
              </button>

              <p className="text-sm mt-6 text-center text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="text-slate-800 font-extrabold hover:text-emerald-600 transition-colors">Sign in</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
