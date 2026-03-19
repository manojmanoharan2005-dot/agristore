import { useEffect, useState } from 'react';
import UserSidebar from '../components/UserSidebar';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Edit2, X, Check } from 'lucide-react';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && !isEditing) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user, isEditing]);

  const save = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put('/auth/profile', form);
      updateUser(data.user);
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      alert(err?.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container py-8 grid lg:grid-cols-[320px_1fr] gap-6 items-start">
      <UserSidebar />

      <div className="card p-8 md:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
          <div>
            <p className="text-xs tracking-[0.18em] font-extrabold text-slate-400">ACCOUNT</p>
            <h1 className="text-[3rem] font-black italic leading-none text-slate-800 mt-2">My Profile</h1>
          </div>
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 font-bold text-sm bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
            >
              <Edit2 size={16} /> Edit Profile
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
              }}
              className="px-4 py-2 font-bold text-sm bg-slate-100 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <X size={16} /> Cancel
            </button>
          )}
        </div>

        <form onSubmit={save} className="grid md:grid-cols-2 gap-4">
          <input 
            className={`input-field ${!isEditing ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''}`} 
            placeholder="Full Name" 
            value={form.name} 
            onChange={(e) => setForm(v => ({ ...v, name: e.target.value }))} 
            disabled={!isEditing}
          />
          <input 
            className={`input-field ${!isEditing ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''}`} 
            type="email" 
            placeholder="Email" 
            value={form.email} 
            onChange={(e) => setForm(v => ({ ...v, email: e.target.value }))} 
            disabled={!isEditing}
          />
          <input 
            className={`input-field ${!isEditing ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''}`} 
            placeholder="Phone Number" 
            value={form.phone} 
            onChange={(e) => setForm(v => ({ ...v, phone: e.target.value }))} 
            disabled={!isEditing}
          />
          
          {isEditing && (
            <button 
              disabled={loading}
              className="btn-secondary md:col-span-2 mt-4 py-3.5 rounded-2xl text-sm font-black tracking-[0.12em] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Check size={18} />
              {loading ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default Profile;
