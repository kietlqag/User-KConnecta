import { ReactNode } from 'react';

interface LiveOptionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  features: string[];
  buttonText: string;
  buttonVariant: 'primary' | 'secondary';
  onClick: () => void;
}

export const LiveOptionCard = ({
  icon,
  title,
  description,
  features,
  buttonText,
  buttonVariant,
  onClick,
}: LiveOptionCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-8 flex flex-col items-center text-center hover:shadow-lg transition-shadow">
      {/* Icon */}
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
        buttonVariant === 'primary' ? 'bg-blue-100' : 'bg-gray-100'
      }`}>
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold mb-3">{title}</h3>

      {/* Description */}
      <p className="text-gray-600 text-sm mb-6">{description}</p>

      {/* Features */}
      <ul className="space-y-3 mb-8 w-full">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3 text-left">
            <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${
              buttonVariant === 'primary' ? 'bg-blue-600' : 'bg-gray-600'
            }`} />
            <span className="text-sm text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      {/* Button */}
      <button
        onClick={onClick}
        className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
          buttonVariant === 'primary'
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
        }`}
      >
        {buttonText}
      </button>
    </div>
  );
};
