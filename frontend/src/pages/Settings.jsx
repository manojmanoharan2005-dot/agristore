import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserSidebar from '../components/UserSidebar';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [passwordForm, setPasswordForm] = useState({ otp: '', newPassword: '' });
  const [loading, setLoading] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const requestOtp = async () => {
    setError('');
    setMsg('');
    try {
      setLoading(true);
      const { data } = await api.post('/auth/request-password-otp');
      setOtpRequested(true);
      setMsg(data.message || 'OTP sent to your email');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not request OTP');
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    if (!/^\d{6}$/.test(passwordForm.otp)) {
      setError('Enter a valid 6-digit OTP');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post('/auth/change-password-otp', passwordForm);
      setPasswordForm({ otp: '', newPassword: '' });
      setMsg(data.message || 'Password updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update password');
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm('Delete your account permanently?')) return;
    await api.delete('/auth/account');
    logout();
    navigate('/register');
  };

  return (
    <div className="page-container py-8 grid lg:grid-cols-[320px_1fr] gap-6 items-start">
      <UserSidebar />

      <div className="space-y-5">
        <div className="card p-8 md:p-10">
          <p className="text-xs tracking-[0.18em] font-extrabold text-slate-400">ACCOUNT</p>
          <h1 className="text-[3rem] font-black italic leading-none text-slate-800 mt-2 mb-7">Settings</h1>

          <h2 className="font-black text-slate-700 tracking-wide mb-4">CHANGE PASSWORD (OTP)</h2>

          <button
            type="button"
            onClick={requestOtp}
            disabled={loading}
            className="btn-outline py-3 rounded-2xl text-sm font-black tracking-[0.12em]"
          >
            {loading && !otpRequested ? 'REQUESTING OTP...' : 'REQUEST OTP'}
          </button>

          {msg && <p className="text-sm text-emerald-600 mt-3">{msg}</p>}
          {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}

          <form onSubmit={updatePassword} className="grid md:grid-cols-2 gap-4">
            <input className="input-field" placeholder="Enter 6-digit OTP" value={passwordForm.otp} onChange={(e) => setPasswordForm(v => ({ ...v, otp: e.target.value.replace(/\D/g, '').slice(0, 6) }))} />
            <input className="input-field" type="password" placeholder="New Password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm(v => ({ ...v, newPassword: e.target.value }))} />
            <button disabled={loading} className="btn-secondary md:col-span-2 py-3 rounded-2xl text-sm font-black tracking-[0.12em]">
              {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
            </button>
          </form>
        </div>

        <div className="card p-8 border-rose-200 bg-rose-50/40">
          <h2 className="font-black text-rose-700 tracking-wide mb-2">DANGER ZONE</h2>
          <p className="text-sm text-slate-500 mb-4">Delete your account and all data permanently.</p>
          <button className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl text-xs font-black tracking-[0.12em]" onClick={deleteAccount}>
            DELETE ACCOUNT
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
