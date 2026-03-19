import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorToast from '../components/ErrorToast';
import AuthHeader from '../components/AuthHeader';
import authFarmIllustration from '../assets/auth-farm-illustration.svg';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, requestLoginOtp, loginWithOtp } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpInfo, setOtpInfo] = useState('');
  const [error, setError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [otpRequestLoading, setOtpRequestLoading] = useState(false);
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const email = params.get('email');
    if (email) {
      setForm((prev) => ({ ...prev, email }));
    }
  }, [location.search]);

  const inputCls = 'w-full bg-white border border-slate-300 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-sm text-slate-700 placeholder:text-slate-400';

  const getPostLoginPath = (role) => {
    const params = new URLSearchParams(location.search);
    const redirect = params.get('redirect');
    if (redirect && redirect.startsWith('/')) return redirect;
    return role === 'admin' ? '/admin' : '/products';
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPasswordLoading(true);
    const result = await login(form.email, form.password);
    setPasswordLoading(false);
    if (!result.success) return setError(result.message);
    navigate(getPostLoginPath(result.user?.role), { replace: true });
  };

  const onRequestOtp = async () => {
    setError('');
    setOtpInfo('');

    if (!form.email.trim()) {
      setError('Please enter your email before requesting OTP.');
      return;
    }

    setOtpRequestLoading(true);
    const result = await requestLoginOtp(form.email.trim());
    setOtpRequestLoading(false);
    if (!result.success) {
      setOtpSent(false);
      setOtp('');
      return setError(result.message);
    }

    setOtpSent(true);
    const info = result.devOtp
      ? `${result.message} Dev OTP: ${result.devOtp}`
      : result.message;
    setOtpInfo(info);
  };

  const onLoginWithOtp = async () => {
    setError('');

    if (!otpSent) {
      setError('Please request OTP first.');
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter a valid 6-digit OTP.');
      return;
    }

    setOtpVerifyLoading(true);
    const result = await loginWithOtp(form.email.trim(), otp);
    setOtpVerifyLoading(false);
    if (!result.success) return setError(result.message);
    navigate(getPostLoginPath(result.user?.role), { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#eef1f5] flex flex-col">
      <ErrorToast message={error} onClose={() => setError('')} />
      <AuthHeader />

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-5xl rounded-3xl border border-slate-200 shadow-xl overflow-hidden bg-white">
          <div className="grid md:grid-cols-[42%_58%]">
            <div className="bg-[linear-gradient(165deg,#f8fafc_0%,#f1f5f9_50%,#ffffff_100%)] p-8 sm:p-10 text-slate-800 flex flex-col border-r border-slate-200">
              <p className="text-xs tracking-[0.2em] font-extrabold text-slate-400">WELCOME BACK</p>
              <h1 className="text-4xl font-extrabold mt-3 mb-4">Login</h1>
              <p className="text-base text-slate-600 leading-7 max-w-xs">
                Get access to your Orders, Wishlist and Recommendations.
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
              <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Sign in to your account</h2>
              <p className="text-sm text-slate-400 mb-6">Use password or OTP to continue.</p>
              <div className="space-y-4">
                <input
                  className={inputCls}
                  type="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={(e) => setForm(v => ({ ...v, email: e.target.value }))}
                  required
                />
                <input
                  className={inputCls}
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm(v => ({ ...v, password: e.target.value }))}
                  required
                />
              </div>

              <p className="text-[12px] text-slate-400 mt-5 leading-relaxed">
                By continuing, you agree to AgriStore&apos;s
                <span className="text-emerald-600 font-semibold"> Terms of Use </span>&amp;
                <span className="text-emerald-600 font-semibold"> Privacy Policy.</span>
              </p>

              {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

              <button
                disabled={passwordLoading || otpRequestLoading || otpVerifyLoading}
                className="w-full mt-6 bg-slate-900 hover:bg-black text-white font-bold tracking-widest py-3.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {passwordLoading ? 'SIGNING IN...' : 'LOGIN'}
              </button>

              <div className="my-5 flex items-center gap-3 text-slate-300 text-xs font-bold tracking-widest">
                <span className="h-px bg-slate-200 flex-1" />
                OR
                <span className="h-px bg-slate-200 flex-1" />
              </div>

              <button
                type="button"
                disabled={passwordLoading || otpRequestLoading || otpVerifyLoading}
                onClick={onRequestOtp}
                className="w-full border-2 border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 font-bold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm tracking-widest"
              >
                {otpRequestLoading ? 'REQUESTING OTP...' : 'REQUEST OTP'}
              </button>

              {otpInfo && <p className="text-xs text-emerald-700 mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{otpInfo}</p>}

              {otpSent && (
                <div className="mt-4 space-y-3">
                  <input
                    className={inputCls}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  <button
                    type="button"
                    disabled={passwordLoading || otpRequestLoading || otpVerifyLoading}
                    onClick={onLoginWithOtp}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm tracking-widest"
                  >
                    {otpVerifyLoading ? 'VERIFYING...' : 'LOGIN WITH OTP'}
                  </button>
                </div>
              )}

              <p className="text-sm mt-7 text-center text-slate-500">
                New to AgriStore?{' '}
                <Link to="/register" className="text-slate-800 font-extrabold hover:text-emerald-600 transition-colors">Create an account</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
