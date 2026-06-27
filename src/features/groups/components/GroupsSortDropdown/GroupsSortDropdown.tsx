import { useEffect, useRef, useState } from 'react';
import { ArrowDownUp, Check } from 'lucide-react';
import {
  GROUP_SORT_OPTIONS,
  type GroupSortKey,
} from '../../utils/groupSort';

interface GroupsSortDropdownProps {
  value: GroupSortKey;
  onChange: (key: GroupSortKey) => void;
}

export const GroupsSortDropdown = ({ value, onChange }: GroupsSortDropdownProps) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex cursor-pointer items-center gap-1.5 text-[15px] font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ArrowDownUp className="h-4 w-4" />
        Sắp xếp
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          {GROUP_SORT_OPTIONS.map((option) => {
            const isActive = option.key === value;
            return (
              <button
                key={option.key}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  onChange(option.key);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-[14px] transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  isActive
                    ? 'font-semibold text-emerald-600'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                {option.label}
                {isActive && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
