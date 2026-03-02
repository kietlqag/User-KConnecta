import { MarketplaceProduct } from '../../types/marketplace.types';

interface ProductCardProps {
  product: MarketplaceProduct;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price).replace('₫', 'đ');
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.isNew && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-teal-500 text-white text-xs font-semibold rounded">
            Mới niêm yết
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-3">
        <div className="text-lg font-semibold mb-1">{formatPrice(product.price)}</div>
        <h3 className="text-sm text-gray-900 mb-1 line-clamp-2">{product.title}</h3>
        <p className="text-xs text-gray-500">{product.location}</p>
      </div>
    </div>
  );
};
