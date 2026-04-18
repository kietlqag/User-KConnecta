import { MenuItem } from '../../types/menu.types';

interface MenuItemCardProps {
  item: MenuItem;
  onClick?: () => void;
}

export const MenuItemCard = ({ item, onClick }: MenuItemCardProps) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
    >
      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm text-gray-900">{item.title}</h3>
        {item.description && (
          <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
        )}
      </div>
    </button>
  );
};
