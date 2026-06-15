import { ReactNode } from 'react';

interface LiveOptionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  buttonText: string;
  buttonVariant: 'primary' | 'secondary';
  onClick: () => void;
}

export const LiveOptionCard = ({
  icon,
  title,
  description,
  buttonText,
  buttonVariant,
  onClick,
}: LiveOptionCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-8 flex flex-col items-center text-center hover:shadow-lg transition-shadow">
      {/* Icon */}
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
        buttonVariant === 'primary' ? 'bg-green-100' : 'bg-gray-100'
      }`}>
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold mb-3">{title}</h3>

      {/* Description */}
      <p className="text-gray-600 text-sm mb-6">{description}</p>

      {/* Button */}
      <button
        onClick={onClick}
        className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
          buttonVariant === 'primary'
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
        }`}
      >
        {buttonText}
      </button>
    </div>
  );
};
