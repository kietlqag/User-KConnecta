import { CreateItem } from '../../types/menu.types';

interface CreateItemCardProps {
  item: CreateItem;
  onClick?: () => void;
}

export const CreateItemCard = ({ item, onClick }: CreateItemCardProps) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left w-full"
    >
      <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
        {item.icon}
      </div>
      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{item.title}</span>
    </button>
  );
};
