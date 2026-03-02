export interface MenuItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description?: string;
  href?: string;
}

export interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

export interface CreateItem {
  id: string;
  icon: React.ReactNode;
  title: string;
}
