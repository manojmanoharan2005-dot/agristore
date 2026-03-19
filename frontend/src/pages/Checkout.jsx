import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  CreditCard,
  Mail,
  MapPin,
  ShieldCheck,
  Truck
} from 'lucide-react';
import api from '../utils/api';
import { useCart } from '../context/CartContext';

const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

const stepTitleClass = 'text-[11px] font-extrabold tracking-[0.2em] text-slate-400';
const ADDRESSES_CACHE_KEY = 'agristore_addresses_cache_v1';

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, getCartTotal, clearCart } = useCart();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [placing, setPlacing] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState({ 1: false, 2: false, 3: false, 4: false });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    name: '', phone: '', pincode: '', locality: '', address: '', city: '', state: '', type: 'Home'
  });

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const hasAccount = Boolean(currentUser);
    setCompletedSteps((prev) => ({ ...prev, 1: hasAccount }));
    if (hasAccount && activeStep === 1) setActiveStep(2);
  }, [currentUser, activeStep]);

  useEffect(() => {
    const hydrateAddressStep = (list) => {
      setAddresses(list);
      const defaultAddress = list.find((a) => a.isDefault);
      if (defaultAddress) setSelectedAddressId(defaultAddress._id);
      else if (list.length) setSelectedAddressId(list[0]._id);

      const hasAddress = Boolean(defaultAddress || list.length);
      setCompletedSteps((prev) => ({ ...prev, 2: hasAddress }));
      setActiveStep((prev) => {
        if (prev > 2) return prev;
        return hasAddress ? 3 : 2;
      });
    };

    try {
      const cached = localStorage.getItem(ADDRESSES_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) hydrateAddressStep(parsed);
      }
    } catch {
      // Ignore invalid cache payloads and fallback to network.
    }

    const fetchAddresses = async () => {
      try {
        const { data } = await api.get('/addresses');
        const fresh = data.addresses || [];
        hydrateAddressStep(fresh);
        localStorage.setItem(ADDRESSES_CACHE_KEY, JSON.stringify(fresh));
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load addresses');
      }
    };
    fetchAddresses();
  }, []);

  useEffect(() => {
    setCompletedSteps((prev) => ({ ...prev, 2: Boolean(selectedAddressId) }));
  }, [selectedAddressId]);

  const selectedAddress = useMemo(
    () => addresses.find((a) => a._id === selectedAddressId),
    [addresses, selectedAddressId]
  );

  const total = getCartTotal();
  const discount = Math.round(total * 0.17);
  const originalPrice = total + discount;

  const shippingPayload = selectedAddress
    ? {
      name: selectedAddress.name,
      phone: selectedAddress.phone,
      street: `${selectedAddress.locality}, ${selectedAddress.address}`,
      city: selectedAddress.city,
      state: selectedAddress.state,
      pincode: selectedAddress.pincode
    }
    : null;

  const addAddress = async () => {
    setError('');

    const payload = {
      name: addressForm.name.trim(),
      phone: addressForm.phone.trim(),
      pincode: addressForm.pincode.trim(),
      locality: addressForm.locality.trim(),
      address: addressForm.address.trim(),
      city: addressForm.city.trim(),
      state: addressForm.state.trim(),
      type: addressForm.type || 'Home',
      isDefault: addresses.length === 0
    };

    const missingField = Object.entries({
      name: payload.name,
      phone: payload.phone,
      pincode: payload.pincode,
      locality: payload.locality,
      address: payload.address,
      city: payload.city,
      state: payload.state
    }).find(([, value]) => !value)?.[0];

    if (missingField) {
      setError(`Please enter ${missingField} to save address`);
      return;
    }

    try {
      setSavingAddress(true);
      const { data } = await api.post('/addresses', payload);

      // Refresh from DB to keep local list in sync with server-side defaults.
      const refreshed = await api.get('/addresses');
      const nextAddresses = refreshed.data.addresses || [];
      setAddresses(nextAddresses);
      localStorage.setItem(ADDRESSES_CACHE_KEY, JSON.stringify(nextAddresses));
      setSelectedAddressId(data.address?._id || nextAddresses[0]?._id || '');
      setError('');
      setCompletedSteps((prev) => ({ ...prev, 2: true }));
      setActiveStep(3);

      setAddressForm({
        name: '', phone: '', pincode: '', locality: '', address: '', city: '', state: '', type: 'Home'
      });
      setShowAddressForm(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not save address');
    } finally {
      setSavingAddress(false);
    }
  };

  const placeCodOrder = async () => {
    await api.post('/orders', {
      items: cart.map((item) => ({ productId: item._id, quantity: item.quantity })),
      shippingAddress: shippingPayload,
      paymentMethod: 'COD'
    });
    clearCart();
    navigate('/my-orders');
  };

  const placeOnlineOrder = async () => {
    const ready = await loadRazorpay();
    if (!ready) throw new Error('Razorpay SDK failed to load. Please try again.');

    const { data: orderData } = await api.post('/payments/create-order', { amount: total });
    const razorpayKey = orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!razorpayKey) throw new Error('Razorpay key missing. Configure payment key.');

    await new Promise((resolve, reject) => {
      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'AgriStore',
        description: 'Order Payment',
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            await api.post('/payments/verify', {
              ...response,
              items: cart.map((item) => ({ productId: item._id, quantity: item.quantity })),
              shippingAddress: shippingPayload,
              notes: 'Paid online via Razorpay'
            });
            clearCart();
            navigate('/my-orders');
            resolve();
          } catch (verifyError) {
            reject(verifyError);
          }
        },
        modal: {
          ondismiss: () => reject(new Error('Payment was cancelled'))
        },
        prefill: {
          name: shippingPayload?.name,
          contact: shippingPayload?.phone,
          email: currentUser?.email
        },
        theme: { color: '#10b981' }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (event) => {
        reject(new Error(event?.error?.description || 'Payment failed. Please try again.'));
      });
      rzp.open();
    });
  };

  const verifyAddressStep = () => {
    if (!selectedAddressId) {
      setError('Please select a delivery address');
      setActiveStep(2);
      return false;
    }
    setCompletedSteps((prev) => ({ ...prev, 2: true }));
    return true;
  };

  const goToOrderSummary = () => {
    setError('');
    if (!verifyAddressStep()) return;
    setActiveStep(3);
  };

  const goToPayment = () => {
    setError('');
    if (!verifyAddressStep()) return;
    if (!cart.length) {
      setError('Cart is empty');
      return;
    }
    setCompletedSteps((prev) => ({ ...prev, 3: true }));
    setActiveStep(4);
  };

  const placeOrder = async () => {
    setError('');
    if (!verifyAddressStep()) return;
    if (!cart.length) {
      setError('Cart is empty');
      return;
    }
    setCompletedSteps((prev) => ({ ...prev, 3: true }));

    try {
      setPlacing(true);
      if (paymentMethod === 'COD') await placeCodOrder();
      else await placeOnlineOrder();
      setCompletedSteps((prev) => ({ ...prev, 4: true }));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="page-container py-8">
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-5">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {completedSteps[1]
                  ? <CheckCircle2 className="text-emerald-500" size={30} />
                  : <Circle className="text-slate-300" size={30} />}
                <div>
                  <p className={stepTitleClass}>STEP 1</p>
                  <h2 className="text-[2rem] font-black text-secondary leading-none">Account Details</h2>
                  <p className="text-slate-500 text-sm mt-2">
                    {currentUser?.name || 'Guest User'}{currentUser?.phone ? ` | ${currentUser.phone}` : ''}
                  </p>
                </div>
              </div>
              <button className="rounded-full bg-slate-100 px-5 py-2 text-xs font-extrabold tracking-wide text-slate-400">MODIFY</button>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {completedSteps[2]
                  ? <CheckCircle2 className="text-emerald-500" size={30} />
                  : <Circle className="text-slate-300" size={30} />}
                <div>
                  <p className={stepTitleClass}>STEP 2</p>
                  <h2 className="text-[2rem] font-black text-secondary leading-none">Delivery Address</h2>
                  <p className="text-slate-500 text-sm mt-2">
                    {selectedAddress ? `${selectedAddress.name}, ${selectedAddress.city}` : 'Select delivery address'}
                  </p>
                </div>
              </div>
              <button className="rounded-full bg-slate-100 px-5 py-2 text-xs font-extrabold tracking-wide text-slate-400">MODIFY</button>
            </div>

            <div className="mt-5 grid gap-3">
              {addresses.map((addr) => {
                const active = selectedAddressId === addr._id;
                return (
                  <label
                    key={addr._id}
                    className={`rounded-2xl border p-4 cursor-pointer transition-colors ${active ? 'border-secondary bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <input
                          type="radio"
                          checked={active}
                          onChange={() => setSelectedAddressId(addr._id)}
                          className="mt-1"
                        />
                        <div>
                          <p className="font-bold text-secondary">{addr.name}</p>
                          <p className="text-sm text-slate-500">
                            {addr.locality}, {addr.address}, {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                        </div>
                      </div>
                      <MapPin size={16} className="text-slate-300" />
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setShowAddressForm((v) => !v);
                }}
                className="text-sm font-bold text-slate-400 hover:text-secondary"
              >
                + MANAGE ADDRESSES
              </button>
              <button
                type="button"
                onClick={goToOrderSummary}
                className="ml-auto rounded-2xl bg-secondary text-white px-6 py-3 text-sm font-extrabold tracking-widest"
              >
                DELIVER TO THIS ADDRESS
              </button>
            </div>

            {showAddressForm && (
              <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-bold text-secondary mb-3">Add New Address</p>
                <div className="grid md:grid-cols-2 gap-2">
                  <input className="input-field" placeholder="Name" value={addressForm.name} onChange={(e) => { setError(''); setAddressForm((v) => ({ ...v, name: e.target.value })); }} />
                  <input className="input-field" placeholder="Phone" value={addressForm.phone} onChange={(e) => { setError(''); setAddressForm((v) => ({ ...v, phone: e.target.value })); }} />
                  <input className="input-field" placeholder="Pincode" value={addressForm.pincode} onChange={(e) => { setError(''); setAddressForm((v) => ({ ...v, pincode: e.target.value })); }} />
                  <input className="input-field" placeholder="Locality" value={addressForm.locality} onChange={(e) => { setError(''); setAddressForm((v) => ({ ...v, locality: e.target.value })); }} />
                  <input className="input-field md:col-span-2" placeholder="Address" value={addressForm.address} onChange={(e) => { setError(''); setAddressForm((v) => ({ ...v, address: e.target.value })); }} />
                  <input className="input-field" placeholder="City" value={addressForm.city} onChange={(e) => { setError(''); setAddressForm((v) => ({ ...v, city: e.target.value })); }} />
                  <input className="input-field" placeholder="State" value={addressForm.state} onChange={(e) => { setError(''); setAddressForm((v) => ({ ...v, state: e.target.value })); }} />
                </div>
                <button type="button" className="btn-primary mt-3" onClick={addAddress} disabled={savingAddress}>
                  {savingAddress ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            )}
          </section>

          <section className="rounded-[2rem] overflow-hidden border border-slate-200 bg-white">
            <div className="bg-white text-secondary px-6 py-5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                {completedSteps[3]
                  ? <CheckCircle2 className="text-emerald-500" size={30} />
                  : <Circle className="text-slate-300" size={30} />}
                <div>
                  <p className={stepTitleClass}>STEP 3</p>
                  <h2 className="text-[2rem] font-black text-secondary leading-none">Order Summary</h2>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-3">
              {cart.map((item) => {
                const itemDiscount = item.mrp && item.mrp > item.price
                  ? Math.round(((item.mrp - item.price) / item.mrp) * 100)
                  : 0;

                return (
                  <div key={item._id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <div className="p-5 flex items-start gap-4 sm:gap-6">
                      <div className="h-28 w-28 rounded-2xl border border-slate-100 bg-slate-50 p-2 shrink-0 overflow-hidden">
                        <img
                          src={item.imageUrl || ''}
                          alt={item.name}
                          className="h-full w-full object-contain"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-[2rem] leading-none text-secondary">{item.name}</p>
                            <div className="mt-3 flex items-center gap-3">
                              <p className="font-black text-[2.4rem] leading-none text-secondary">Rs.{item.price}</p>
                              {item.mrp && <p className="text-slate-300 line-through font-bold">Rs.{item.mrp}</p>}
                              {itemDiscount > 0 && (
                                <span className="rounded-md bg-emerald-100 text-emerald-600 px-2 py-1 text-xs font-extrabold">{itemDiscount}% OFF</span>
                              )}
                            </div>
                            <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-1.5 text-xs font-extrabold text-emerald-600">
                              <Truck size={14} /> EXPRESS DELIVERY
                            </div>
                          </div>
                          <p className="text-sm text-slate-300 font-extrabold">QUANTITY: {item.quantity}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border-t border-slate-100 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="h-10 w-10 rounded-xl border border-slate-200 bg-white grid place-items-center text-slate-400">
                          <Mail size={16} />
                        </span>
                        <div>
                          <p className="italic">Order details will be sent to</p>
                          <p className="font-bold text-secondary">{currentUser?.email || 'your email'}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={goToPayment}
                        className="rounded-[1.5rem] bg-secondary text-white px-8 py-3 text-sm font-extrabold tracking-widest"
                      >
                        CONTINUE TO PAYMENT
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[2rem] overflow-hidden border border-slate-200 bg-white">
            <button
              type="button"
              onClick={goToPayment}
              className="w-full text-left px-6 py-5 transition-colors bg-white text-secondary border-b border-slate-200"
            >
              <div className="flex items-center gap-3">
                {completedSteps[4]
                  ? <CheckCircle2 className="text-emerald-500" size={30} />
                  : <Circle className="text-slate-300" size={30} />}
                <div>
                  <p className={stepTitleClass}>STEP 4</p>
                  <h2 className="text-[2rem] font-black text-secondary leading-none">Payment Method</h2>
                </div>
              </div>
            </button>

            {activeStep === 4 && (
              <div className="p-6 space-y-3">
              <label className={`rounded-2xl border p-4 flex items-center justify-between cursor-pointer ${paymentMethod === 'COD' ? 'border-secondary' : 'border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  {paymentMethod === 'COD' ? <CheckCircle2 className="text-secondary" size={20} /> : <Circle size={20} className="text-slate-300" />}
                  <div>
                    <p className="font-black text-[1.75rem] leading-none text-secondary">Cash on Delivery</p>
                    <p className="text-xs text-slate-400 mt-2">Pay when your order is delivered.</p>
                  </div>
                </div>
                <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} />
                <Truck className="text-slate-300" size={22} />
              </label>

              <label className={`rounded-2xl border p-4 flex items-center justify-between cursor-pointer ${paymentMethod === 'Online' ? 'border-secondary' : 'border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  {paymentMethod === 'Online' ? <CheckCircle2 className="text-secondary" size={20} /> : <Circle size={20} className="text-slate-300" />}
                  <div>
                    <p className="font-black text-[1.75rem] leading-none text-secondary">Pay Online</p>
                    <p className="text-xs text-slate-400 mt-2">UPI, cards, netbanking via Razorpay.</p>
                  </div>
                </div>
                <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'Online'} onChange={() => setPaymentMethod('Online')} />
                <CreditCard className="text-slate-300" size={22} />
              </label>

              <div className="mt-5 border-t border-slate-100 pt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-extrabold tracking-[0.2em] text-slate-400">TOTAL AMOUNT PAYABLE</p>
                  <p className="font-black text-[3rem] leading-none text-secondary mt-2">Rs. {total}</p>
                </div>
                <button
                  type="button"
                  onClick={placeOrder}
                  disabled={placing}
                  className="rounded-[1.5rem] bg-emerald-300 hover:bg-emerald-400 disabled:opacity-60 text-white px-10 py-5 text-sm font-extrabold tracking-[0.2em]"
                >
                  {placing ? 'PROCESSING...' : paymentMethod === 'Online' ? 'PAY NOW' : 'PLACE ORDER'}
                </button>
              </div>

              {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-slate-50 px-6 py-5 flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-secondary text-white grid place-items-center shadow-lg">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-sm font-extrabold tracking-[0.2em] text-secondary">SAFE DELIVERY POLICY</p>
              <p className="text-sm text-slate-500 mt-2">
                Products are handled with care. Please ensure someone is available to receive and store items safely.
              </p>
            </div>
          </section>
        </div>

        <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 h-fit sticky top-24">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[2.5rem] font-black leading-none text-secondary">Price Details</h3>
              <p className="text-xs font-extrabold tracking-[0.2em] text-slate-400 mt-1">SUMMARY</p>
            </div>
            <CreditCard className="text-slate-300" size={20} />
          </div>

          <div className="mt-5 space-y-5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold tracking-wide">TOTAL PRICE ({cart.length} items)</span>
              <span className="font-extrabold text-secondary">Rs. {originalPrice}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold tracking-wide">TOTAL DISCOUNT</span>
              <span className="font-extrabold text-emerald-500">- Rs. {discount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold tracking-wide">DELIVERY CHARGES</span>
              <span className="rounded-xl bg-emerald-100 px-3 py-1 text-emerald-600 font-extrabold">FREE</span>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-6">
            <p className="text-sm font-extrabold tracking-[0.2em] text-secondary">TOTAL AMOUNT</p>
            <p className="text-[4rem] leading-none font-black text-secondary mt-2">Rs. {total}</p>
            <p className="text-emerald-500 font-extrabold tracking-wide mt-2">YOU SAVE: Rs. {discount}</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Checkout;
