import { Header } from '../../home/components/Header';
import { MarketplaceSidebar, ProductCard } from '../components';
import { MarketplaceProduct } from '../types/marketplace.types';
import marketplaceImage from 'figma:asset/5b4cb3f200da18be30ba3014c937ebcb48fc745c.png';

const mockProducts: MarketplaceProduct[] = [
  {
    id: '1',
    title: 'Laptop Gaming MSI Core i7 10th Gen',
    price: 4900000,
    location: 'Vĩnh Long',
    image: 'https://images.unsplash.com/photo-1760999187614-7a3b22a077d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBsYXB0b3AlMjBjb21wdXRlciUyMHRlY2h8ZW58MXx8fHwxNzY5NTg3Nzg2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    isNew: true,
    category: 'electronics',
  },
  {
    id: '2',
    title: 'Màn Hình Máy Tính Bàn',
    price: 10000,
    location: 'Vĩnh Long',
    image: marketplaceImage,
    isNew: true,
    category: 'electronics',
  },
  {
    id: '3',
    title: 'Máy vi tính đồ xưa lưa kèo lớ và sóng tỏa khêm lõa để tỏ thành',
    price: 4500000,
    location: 'Bạch Giả',
    image: 'https://images.unsplash.com/photo-1723403067433-73299460534a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3RvcmN5Y2xlJTIwc2Nvb3RlciUyMHZlaGljbGV8ZW58MXx8fHwxNzY5NjY5MjExfDA&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'vehicles',
  },
  {
    id: '4',
    title: 'Thanh lì samsung note z6Ultra 5G',
    price: 2900000,
    location: 'Cần Thơ',
    image: 'https://images.unsplash.com/photo-1741061963569-9d0ef54d10d2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWFydHBob25lJTIwbW9iaWxlJTIwcGhvbmV8ZW58MXx8fHwxNzY5NTg2NzEyfDA&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'electronics',
  },
  {
    id: '5',
    title: 'Em cần bảo giáo con 1tprp',
    price: 2500000,
    location: 'Huỳnh Nam Dũng, Viện Giáp, Vietnam',
    image: marketplaceImage,
    category: 'other',
  },
  {
    id: '6',
    title: 'Camera Hành Trình',
    price: 850,
    location: 'Vĩnh Long',
    image: 'https://images.unsplash.com/photo-1764557359097-f15dd0c0a17b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYW1lcmElMjBwaG90b2dyYXBoeSUyMGVxdWlwbWVudHxlbnwxfHx8fDE3Njk2MDM3MDV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    isNew: true,
    category: 'electronics',
  },
  {
    id: '7',
    title: 'Smart TV 55 inch 4K Ultra HD',
    price: 1200000,
    location: 'Thủ đủ m',
    image: 'https://images.unsplash.com/photo-1556889487-b6f8d3fc728b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWxldmlzaW9uJTIwdHYlMjBzY3JlZW58ZW58MXx8fHwxNzY5NjY5MjE2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'electronics',
  },
  {
    id: '8',
    title: 'Sofa Góc Hiện Đại',
    price: 7500000,
    location: 'Hà Nội',
    image: 'https://images.unsplash.com/photo-1768946052273-0a2dd7f3e365?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBmdXJuaXR1cmUlMjBzb2ZhfGVufDF8fHx8MTc2OTYxOTE5MXww&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'furniture',
  },
  {
    id: '9',
    title: 'Xe Đạp Thể Thao',
    price: 2600000,
    location: 'An Giang, Vietnam',
    image: 'https://images.unsplash.com/photo-1605050825473-dddb75d9e703?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiaWN5Y2xlJTIwYmlrZSUyMHNwb3J0c3xlbnwxfHx8fDE3Njk2NjkyMTN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'sports',
  },
  {
    id: '10',
    title: 'Đồng Hồ Nam Cao Cấp',
    price: 3500000,
    location: 'TP. Hồ Chí Minh',
    image: 'https://images.unsplash.com/photo-1571582665859-4a5f472ee21b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3cmlzdHdhdGNoJTIwZmFzaGlvbiUyMGFjY2Vzc29yeXxlbnwxfHx8fDE3Njk2NjkyMTZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'fashion',
  },
  {
    id: '11',
    title: 'Giày Thể Thao Nike Air',
    price: 1800000,
    location: 'Đà Nẵng',
    image: 'https://images.unsplash.com/photo-1650320079970-b4ee8f0dae33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbmVha2VycyUyMHNob2VzJTIwZmFzaGlvbnxlbnwxfHx8fDE3Njk2MDE2MDF8MA&ixlib=rb-4.1.0&q=80&w=1080',
    isNew: true,
    category: 'fashion',
  },
  {
    id: '12',
    title: 'Tai Nghe Bluetooth ANC',
    price: 980000,
    location: 'Cần Thơ',
    image: 'https://images.unsplash.com/photo-1629555258982-b920af8da52d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFkcGhvbmVzJTIwYXVkaW8lMjBlcXVpcG1lbnR8ZW58MXx8fHwxNzY5NTc3NzE2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'electronics',
  },
  {
    id: '13',
    title: 'iPad Pro 12.9 inch M2',
    price: 18500000,
    location: 'Hà Nội',
    image: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YWJsZXQlMjBkZXZpY2UlMjBpcGFkfGVufDF8fHx8MTc2OTYwNzg1MXww&ixlib=rb-4.1.0&q=80&w=1080',
    isNew: true,
    category: 'electronics',
  },
  {
    id: '14',
    title: 'Guitar Acoustic Yamaha',
    price: 2800000,
    location: 'TP. Hồ Chí Minh',
    image: 'https://images.unsplash.com/photo-1628887067605-5171efd812e3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxndWl0YXIlMjBtdXNpY2FsJTIwaW5zdHJ1bWVudHxlbnwxfHx8fDE3Njk1ODkzNDZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'instruments',
  },
  {
    id: '15',
    title: 'Chaly mới lăng',
    price: 1234567,
    location: 'Ấp Mỹ Thủ, An Giang, Vietnam',
    image: marketplaceImage,
    isNew: true,
    category: 'vehicles',
  },
];

export const MarketplacePage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Main Layout */}
      <div className="flex pt-14">
        {/* Left Sidebar */}
        <MarketplaceSidebar />

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Location Badge */}
          <div className="mb-4">
            <span className="inline-flex items-center gap-1 text-sm text-blue-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              Huỳnh Phong Điền · 65 km
            </span>
          </div>

          {/* Today's Picks Header */}
          <h2 className="text-xl font-bold mb-4">Lựa chọn hôm nay</h2>

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {mockProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};