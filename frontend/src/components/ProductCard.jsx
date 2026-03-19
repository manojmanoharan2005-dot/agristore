import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { toSafeImageUrl } from '../utils/imageUrl';

const ProductCard = ({ product, onWishlistChange }) => {
  const { isAuthenticated } = useAuth();
  const [wishlisted, setWishlisted] = useState(Boolean(product?.isWishlisted || product?.wishlistItemId));
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setWishlisted(Boolean(product?.isWishlisted || product?.wishlistItemId));
  }, [product?._id, product?.isWishlisted, product?.wishlistItemId]);

  useEffect(() => {
    setImageFailed(false);
  }, [product?._id, product?.imageUrl]);

  const discount = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  const handleWishlist = async () => {
    if (!isAuthenticated) return;

    const nextState = !wishlisted;
    setWishlisted(nextState);

    try {
      if (nextState) {
        await api.post('/wishlist', { productId: product._id });
      } else {
        await api.delete(`/wishlist/${product._id}`);
      }
      if (onWishlistChange) onWishlistChange();
    } catch {
      setWishlisted(!nextState);
    }
  };

  return (
    <div className="card overflow-hidden group h-full flex flex-col">
      <Link to={`/products/${product._id}`} className="relative bg-slate-100 border-b border-gray-100 aspect-square overflow-hidden block">
        <img
          src={imageFailed || !product.imageUrl ? '/images/placeholder-agri.png' : toSafeImageUrl(product.imageUrl)}
          alt={product.name}
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <span className="absolute top-3 left-3 badge bg-primary text-white rounded-sm">{product.category}</span>
        {product.isTrending && (
          <span className="absolute top-3 right-3 badge bg-accent text-white">Trending</span>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/45 text-white flex items-center justify-center font-semibold">Sold Out</div>
        )}
        {product.stock > 0 && product.stock < 10 && (
          <span className="absolute bottom-3 right-3 badge bg-orange-100 text-orange-700">Low Stock</span>
        )}
      </Link>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/products/${product._id}`} className="font-semibold text-primary hover:text-accent line-clamp-2">
            {product.name}
          </Link>
          {isAuthenticated && (
            <button onClick={handleWishlist} className={`p-1.5 rounded-lg hover:bg-gray-100 ${wishlisted ? 'text-rose-500' : 'text-gray-500'}`}>
              <Heart size={16} className={wishlisted ? 'fill-current' : ''} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
          <span className="inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full text-amber-700">
            <Star size={13} className="fill-current" /> {product.rating?.toFixed(1) || '0.0'}
          </span>
          <span>({product.reviewCount || 0})</span>
        </div>

        <div className="mt-3 flex items-end gap-2">
          <span className="text-xl font-bold text-primary">Rs. {product.price}</span>
          {product.mrp && <span className="text-sm text-gray-400 line-through">Rs. {product.mrp}</span>}
          {discount > 0 && <span className="text-xs font-semibold text-green-600">{discount}% off</span>}
        </div>

        <p className="text-xs text-green-700 mt-1 font-medium">Free delivery</p>
      </div>
    </div>
  );
};

export default ProductCard;
