import { ChevronUp, ChevronDown } from 'lucide-react';

interface ReelNavigationProps {
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export const ReelNavigation = ({
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: ReelNavigationProps) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Previous Reel */}
      <button
        onClick={onPrevious}
        disabled={!hasPrevious}
        className={`w-12 h-12 rounded-full backdrop-blur-sm flex items-center justify-center transition-all border border-white/20 ${
          hasPrevious
            ? 'bg-white/20 hover:bg-white/30 cursor-pointer'
            : 'bg-white/10 cursor-not-allowed opacity-50'
        }`}
      >
        <ChevronUp className="w-6 h-6 text-white" />
      </button>

      {/* Next Reel */}
      <button
        onClick={onNext}
        disabled={!hasNext}
        className={`w-12 h-12 rounded-full backdrop-blur-sm flex items-center justify-center transition-all border border-white/20 ${
          hasNext
            ? 'bg-white/20 hover:bg-white/30 cursor-pointer'
            : 'bg-white/10 cursor-not-allowed opacity-50'
        }`}
      >
        <ChevronDown className="w-6 h-6 text-white" />
      </button>
    </div>
  );
};