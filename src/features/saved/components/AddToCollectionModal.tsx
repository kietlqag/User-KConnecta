import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';

export interface Collection {
  id: string;
  name: string;
  thumbnail?: string;
}

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Collection[];
  selectedCollectionIds?: string[];
  onAdd: (collectionId: string) => Promise<void>;
  onRemove?: (collectionId: string) => Promise<void>;
  onCreateAndAdd: (name: string) => Promise<Collection>;
}

export function AddToCollectionModal({
  isOpen,
  onClose,
  collections,
  selectedCollectionIds = [],
  onAdd,
  onRemove,
  onCreateAndAdd,
}: AddToCollectionModalProps) {
  const [query, setQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isCreatingLoading, setIsCreatingLoading] = useState(false);
  const [localSelected, setLocalSelected] = useState<string[]>(selectedCollectionIds);
  const [localCollections, setLocalCollections] = useState<Collection[]>(collections);
  const searchRef = useRef<HTMLInputElement>(null);
  const newNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setIsCreating(false);
      setNewName('');
      setNameError('');
      setLocalSelected(selectedCollectionIds);
      setLocalCollections(collections);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setLocalCollections(collections);
  }, [collections]);

  useEffect(() => {
    if (isCreating) setTimeout(() => newNameRef.current?.focus(), 50);
  }, [isCreating]);

  const filtered = localCollections.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const validateNewName = (value: string): string => {
    if (!value.trim()) return 'Vui lòng nhập tên bộ sưu tập.';
    if (value.length > 50) return 'Tên bộ sưu tập không được vượt quá 50 ký tự.';
    if (localCollections.some((c) => c.name.toLowerCase() === value.trim().toLowerCase()))
      return 'Tên bộ sưu tập đã tồn tại.';
    return '';
  };

  const handleSelect = async (collectionId: string) => {
    if (loadingId) return;
    setLoadingId(collectionId);
    try {
      const wasSelected = localSelected.includes(collectionId);
      if (wasSelected) {
        await onRemove?.(collectionId);
      } else {
        await onAdd(collectionId);
      }
      setLocalSelected((prev) =>
        prev.includes(collectionId)
          ? prev.filter((id) => id !== collectionId)
          : [...prev, collectionId]
      );
      const col = localCollections.find((c) => c.id === collectionId);
      toast.success(wasSelected ? `Đã gỡ khỏi "${col?.name}".` : `Đã thêm vào "${col?.name}".`);
    } catch {
      toast.error('Không thể cập nhật bộ sưu tập. Vui lòng thử lại.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreateAndAdd = async () => {
    const error = validateNewName(newName);
    if (error) {
      setNameError(error);
      return;
    }
    setIsCreatingLoading(true);
    try {
      const created = await onCreateAndAdd(newName.trim());
      setLocalCollections((prev) => [created, ...prev]);
      setLocalSelected((prev) => [...prev, created.id]);
      toast.success('Tạo bộ sưu tập thành công.');
      setIsCreating(false);
      setNewName('');
    } catch {
      toast.error('Không thể tạo bộ sưu tập. Vui lòng thử lại.');
    } finally {
      setIsCreatingLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[560px]">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          {isCreating && (
            <button
              type="button"
              onClick={() => { setIsCreating(false); setNewName(''); setNameError(''); }}
              className="p-1.5 rounded-full hover:bg-muted text-gray-500 dark:text-gray-400"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h3 className="flex-1 text-base font-bold text-gray-900 dark:text-gray-100">
            {isCreating ? 'Tạo bộ sưu tập mới' : 'Thêm vào bộ sưu tập'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted text-gray-500 dark:text-gray-400"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isCreating ? (
          /* Create new collection inline form */
          <div className="p-4 flex flex-col gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Tạo bộ sưu tập để sắp xếp các nội dung đã lưu.</p>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Tên bộ sưu tập
              </label>
              <input
                ref={newNameRef}
                type="text"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (nameError) setNameError(validateNewName(e.target.value));
                }}
                placeholder="Nhập tên bộ sưu tập"
                maxLength={60}
                className={`w-full px-3 py-2.5 border rounded-lg text-[15px] text-gray-900 dark:text-gray-100 outline-none transition-colors ${
                  nameError
                    ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                }`}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAndAdd(); }}
              />
              <div className="flex items-start justify-between mt-1">
                {nameError ? (
                  <p className="text-xs text-red-500">{nameError}</p>
                ) : <span />}
                <p className={`text-xs ml-auto ${newName.length > 50 ? 'text-red-500' : 'text-gray-400'}`}>
                  {newName.length}/50
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setIsCreating(false); setNewName(''); setNameError(''); }}
                disabled={isCreatingLoading}
                className="flex-1 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-900 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-60 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateAndAdd}
                disabled={isCreatingLoading}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {isCreatingLoading ? 'Đang tạo...' : 'Tạo'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-900 rounded-full">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm kiếm bộ sưu tập"
                  className="flex-1 bg-transparent text-[14px] text-gray-900 dark:text-gray-100 outline-none placeholder:text-gray-400"
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 dark:text-gray-400">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto py-1">
              {/* Create new option */}
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">Tạo bộ sưu tập mới</span>
              </button>

              {filtered.length === 0 && query ? (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">
                  Không tìm thấy bộ sưu tập nào.
                </p>
              ) : (
                filtered.map((col) => {
                  const isSelected = localSelected.includes(col.id);
                  const isLoading = loadingId === col.id;
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => handleSelect(col.id)}
                      disabled={!!loadingId}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left disabled:opacity-60"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0">
                        {col.thumbnail ? (
                          <img src={col.thumbnail} alt={col.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-200 dark:bg-gray-700" />
                        )}
                      </div>
                      <span className="flex-1 text-[15px] font-medium text-gray-900 dark:text-gray-100 truncate">{col.name}</span>
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
                      ) : isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-700 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
