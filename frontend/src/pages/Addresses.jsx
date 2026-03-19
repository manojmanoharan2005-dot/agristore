import { useEffect, useState } from 'react';
import UserSidebar from '../components/UserSidebar';
import api from '../utils/api';

const emptyForm = { name: '', phone: '', pincode: '', locality: '', address: '', city: '', state: '', type: 'Home' };
const ADDRESSES_CACHE_KEY = 'agristore_addresses_cache_v1';

const Addresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await api.get('/addresses');
    const next = data.addresses || [];
    setAddresses(next);
    localStorage.setItem(ADDRESSES_CACHE_KEY, JSON.stringify(next));
  };

  useEffect(() => {
    try {
      const cached = localStorage.getItem(ADDRESSES_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setAddresses(parsed);
          setLoading(false);
        }
      }
    } catch {
      // Ignore invalid cache payloads and fallback to network.
    }

    const refresh = async () => {
      try {
        await load();
      } finally {
        setLoading(false);
      }
    };
    refresh();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (editId) await api.put(`/addresses/${editId}`, form);
    else await api.post('/addresses', form);
    setForm(emptyForm);
    setEditId('');
    load();
  };

  const edit = (addr) => {
    setEditId(addr._id);
    setForm({
      name: addr.name,
      phone: addr.phone,
      pincode: addr.pincode,
      locality: addr.locality,
      address: addr.address,
      city: addr.city,
      state: addr.state,
      type: addr.type || 'Home'
    });
  };

  return (
    <div className="page-container py-8 grid lg:grid-cols-[320px_1fr] gap-6 items-start">
      <UserSidebar />

      <div className="space-y-5">
        <div className="card p-8 md:p-10">
          <p className="text-xs tracking-[0.18em] font-extrabold text-slate-400">ACCOUNT</p>
          <h1 className="text-[3rem] font-black italic leading-none text-slate-800 mt-2 mb-7">Saved Addresses</h1>

          <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
            <input className="input-field" placeholder="Name" value={form.name} onChange={(e) => setForm(v => ({ ...v, name: e.target.value }))} required />
            <input className="input-field" placeholder="Phone" value={form.phone} onChange={(e) => setForm(v => ({ ...v, phone: e.target.value }))} required />
            <input className="input-field" placeholder="Pincode" value={form.pincode} onChange={(e) => setForm(v => ({ ...v, pincode: e.target.value }))} required />
            <input className="input-field" placeholder="Locality" value={form.locality} onChange={(e) => setForm(v => ({ ...v, locality: e.target.value }))} required />
            <input className="input-field md:col-span-2" placeholder="Address" value={form.address} onChange={(e) => setForm(v => ({ ...v, address: e.target.value }))} required />
            <input className="input-field" placeholder="City" value={form.city} onChange={(e) => setForm(v => ({ ...v, city: e.target.value }))} required />
            <input className="input-field" placeholder="State" value={form.state} onChange={(e) => setForm(v => ({ ...v, state: e.target.value }))} required />
            <button className="btn-secondary md:col-span-2 py-3 rounded-2xl text-sm font-black tracking-[0.12em]">{editId ? 'UPDATE ADDRESS' : 'ADD ADDRESS'}</button>
          </form>
        </div>

        <div className="space-y-3">
          {loading ? <div className="card p-10 text-center text-slate-400 font-bold">Loading addresses...</div> : null}
          {addresses.map(addr => (
            <div key={addr._id} className="card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black text-slate-800 text-lg">{addr.name} {addr.isDefault && <span className="badge bg-emerald-100 text-emerald-700 ml-2">DEFAULT</span>}</p>
                  <p className="text-sm text-gray-600">{addr.locality}, {addr.address}, {addr.city}, {addr.state} - {addr.pincode}</p>
                  <p className="text-sm text-gray-500">Phone: {addr.phone}</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <button className="btn-outline px-4 py-2 text-xs font-black tracking-wide" onClick={() => edit(addr)}>EDIT</button>
                  <button className="text-red-600 text-xs font-black tracking-wide px-3" onClick={async () => { await api.delete(`/addresses/${addr._id}`); load(); }}>DELETE</button>
                  {!addr.isDefault && <button className="text-emerald-600 text-xs font-black tracking-wide px-3" onClick={async () => { await api.patch(`/addresses/${addr._id}/default`); load(); }}>SET DEFAULT</button>}
                </div>
              </div>
            </div>
          ))}
          {addresses.length === 0 && <div className="card p-10 text-center text-slate-400 font-bold">No addresses added yet.</div>}
        </div>
      </div>
    </div>
  );
};

export default Addresses;
