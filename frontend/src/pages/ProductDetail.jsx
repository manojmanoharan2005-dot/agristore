import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Minus, Plus, Sparkles, ShieldCheck, FlaskConical } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import api from '../utils/api';
import { useCart } from '../context/CartContext';
import { toSafeImageUrl } from '../utils/imageUrl';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('details');
  const [priceIntel, setPriceIntel] = useState(null);
  const [adviceOpen, setAdviceOpen] = useState(false);
  const [advice, setAdvice] = useState(null);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceError, setAdviceError] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data } = await api.get(`/products/${id}`);
      setProduct(data.product);

      const rel = await api.get('/products', { params: { category: data.product.category } });
      setRelated((rel.data.products || []).filter(p => p._id !== data.product._id).slice(0, 4));
    };
    load();
  }, [id]);

  const fetchIntel = async () => {
    const { data } = await api.get(`/products/${id}/price-intelligence`);
    setPriceIntel(data.intelligence);
  };

  const getAdvice = async () => {
    setAdviceLoading(true);
    setAdviceError('');
    try {
      const { data } = await api.post(`/products/${id}/advice`, {});
      setAdvice(data.advice);
    } catch (err) {
      setAdviceError(err.response?.data?.message || 'Could not fetch AI advice');
    } finally {
      setAdviceLoading(false);
    }
  };

  const openAdviceModal = () => {
    setAdviceOpen(true);
    setAdvice(null);
    setAdviceError('');
    getAdvice();
  };

  if (!product) return <div className="page-container py-20 text-center">Loading product...</div>;

  return (
    <div className="page-container py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="card p-6 bg-gradient-to-br from-emerald-50 to-slate-100">
          <img src={toSafeImageUrl(product.imageUrl)} alt={product.name} className="w-full h-[360px] object-contain mix-blend-multiply" />
        </div>

        <div>
          <span className="badge bg-primary text-white">{product.category}</span>
          <h1 className="text-3xl font-extrabold text-primary mt-3">{product.name}</h1>
          <p className="text-gray-600 mt-3">{product.description}</p>

          <div className="mt-5 flex items-end gap-3">
            <span className="text-3xl font-bold text-primary">Rs. {product.price}</span>
            {product.mrp && <span className="text-gray-400 line-through">Rs. {product.mrp}</span>}
          </div>

          <p className="mt-2 text-sm text-gray-500">Stock: {product.stock} {product.unit}</p>

          <div className="mt-5 flex items-center gap-3">
            <button className="p-2 rounded-lg border" onClick={() => setQty(q => Math.max(1, q - 1))}><Minus size={16} /></button>
            <span className="w-8 text-center font-semibold">{qty}</span>
            <button className="p-2 rounded-lg border" onClick={() => setQty(q => Math.min(product.stock, q + 1))}><Plus size={16} /></button>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="btn-primary" onClick={() => addToCart(product, qty)}>Add to Cart</button>
            <button className="btn-secondary" onClick={() => { addToCart(product, qty); navigate('/checkout'); }}>Buy Now</button>
            <button className="btn-outline inline-flex items-center gap-2" onClick={openAdviceModal}>
              <Sparkles size={16} /> AI Advice
            </button>
          </div>

          <div className="mt-8 card p-4">
            <div className="flex gap-2 mb-4">
              <button onClick={() => setTab('details')} className={`px-3 py-1.5 rounded-lg text-sm ${tab === 'details' ? 'bg-primary text-white' : 'bg-gray-100'}`}>Details</button>
              <button onClick={() => { setTab('price'); fetchIntel(); }} className={`px-3 py-1.5 rounded-lg text-sm ${tab === 'price' ? 'bg-primary text-white' : 'bg-gray-100'}`}>AI Price Intelligence</button>
            </div>
            {tab === 'details' && (
              <div className="space-y-2 text-sm text-gray-700">
                {product.composition && <p><strong>Composition:</strong> {product.composition}</p>}
                {product.usage && <p><strong>Usage:</strong> {product.usage}</p>}
                {!!product.benefits?.length && <p><strong>Benefits:</strong> {product.benefits.join(', ')}</p>}
              </div>
            )}
            {tab === 'price' && (
              <div className="text-sm text-gray-700">
                {priceIntel ? (
                  <div className="space-y-2">
                    <p><strong>Trend:</strong> {priceIntel.trend} ({priceIntel.trendPercentage}%)</p>
                    <p><strong>Advice:</strong> {priceIntel.buyingAdvice}</p>
                    <p><strong>Reason:</strong> {priceIntel.reason}</p>
                    <p><strong>Best Season:</strong> {priceIntel.bestSeason}</p>
                  </div>
                ) : 'Loading intelligence...'}
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-primary mb-4">Related Products</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {related.map(p => <ProductCard key={p._id} product={p} />)}
        </div>
      </section>

      {adviceOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold tracking-[0.2em] text-slate-400">AI PRODUCT PANEL</p>
                <h3 className="text-[2.1rem] font-black italic leading-none text-slate-800 mt-2">{product.name}</h3>
                <p className="text-sm text-slate-500 mt-2">Instant product properties and usage guidance.</p>
              </div>
              <button className="btn-outline px-4 py-2 text-xs font-black tracking-wide" onClick={() => setAdviceOpen(false)}>CLOSE</button>
            </div>

            <div className="mt-5 grid md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-extrabold tracking-wide text-slate-400">CATEGORY</p>
                <p className="text-sm font-black text-slate-700 mt-1">{product.category}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-extrabold tracking-wide text-slate-400">PRICE</p>
                <p className="text-sm font-black text-slate-700 mt-1">Rs. {product.price}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-extrabold tracking-wide text-slate-400">STOCK</p>
                <p className="text-sm font-black text-slate-700 mt-1">{product.stock} {product.unit}</p>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button className="btn-secondary px-5 py-2.5 text-xs font-black tracking-[0.12em]" onClick={getAdvice} disabled={adviceLoading}>
                {adviceLoading ? 'LOADING...' : 'REFRESH AI DETAILS'}
              </button>
            </div>

            {adviceError && <p className="mt-4 text-sm text-red-600">{adviceError}</p>}

            {adviceLoading && !advice && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">Loading AI product details...</div>
            )}

            {advice && (
              <div className="mt-5 grid md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-black text-slate-700 inline-flex items-center gap-2"><FlaskConical size={16} /> AI Product Properties</p>
                  {!!advice.keyProperties?.length ? (
                    <ul className="mt-3 list-disc list-inside text-slate-600 space-y-1">
                      {advice.keyProperties.map((prop, idx) => <li key={idx}>{prop}</li>)}
                    </ul>
                  ) : (
                    <p className="mt-3 text-slate-500">No specific properties available.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-black text-slate-700 inline-flex items-center gap-2"><ShieldCheck size={16} /> Usage and Safety</p>
                  <div className="mt-3 space-y-2 text-slate-600">
                    <p><strong>Suitability:</strong> {advice.suitability}</p>
                    <p><strong>Reason:</strong> {advice.suitabilityReason}</p>
                    <p><strong>Dosage:</strong> {advice.dosage}</p>
                    <p><strong>Application:</strong> {advice.applicationMethod}</p>
                    <p><strong>Best Time:</strong> {advice.bestTime}</p>
                  </div>
                </div>

                {!!advice.keyProperties?.length && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                    <p className="font-black text-slate-700">Recommended Use Cases</p>
                    {!!advice.recommendedUseCases?.length ? (
                      <ul className="mt-3 list-disc list-inside text-slate-600 space-y-1">
                        {advice.recommendedUseCases.map((useCase, idx) => <li key={idx}>{useCase}</li>)}
                      </ul>
                    ) : (
                      <p className="mt-3 text-slate-500">Use according to product label and local expert guidance.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
