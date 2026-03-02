export interface MarketplaceProduct {
  id: string;
  title: string;
  price: number;
  location: string;
  image: string;
  isNew?: boolean;
  category: string;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  icon: string;
}
