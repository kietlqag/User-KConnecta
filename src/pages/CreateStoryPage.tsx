import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { Camera, Check, ChevronRight, Crop, Globe, Music, Search, Settings, Sparkles, Type, UserPlus, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authService, AuthUser } from '@/services/authService';
import { storyService } from '@/services/storyService';

type StoryEditorTool = 'text' | 'music' | 'alt-text' | 'image';

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
}

const musicTracks: MusicTrack[] = [
  { id: '1', title: 'Đạo Bước HongKong', artist: 'No-No-No' },
  { id: '2', title: 'Nâng Lương Tích C', artist: 'DTrung, MẹMê Media' },
  { id: '3', title: 'Đập Là Đập (Yap Y...)', artist: 'Iagadz' },
  { id: '4', title: 'coffee or tea', artist: 'iShye' },
  { id: '5', title: 'It Just Comes and G...', artist: 'Old Man Canyon' },
  { id: '6', title: 'Late Night Walks', artist: 'Teddy Vogel' },
];

const textColorPalette = ['#FFFFFF', '#000000', '#F43F5E', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6', '#F97316'];

export function CreateStoryPage() {
  const navigate = useNavigate();
  const [currentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());
  const userAvatar = currentUser?.avatarUrl || 'https://i.pravatar.cc/80?img=14';
  const userFullName = currentUser?.fullName || 'Khang Nguyen';

  const imageInputRef = useRef<HTMLInputElement>(null);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const editableTextRef = useRef<HTMLDivElement>(null);
  const dragPointerRef = useRef<{ pointerId: number; clientX: number; clientY: number; moved: boolean } | null>(null);
  const resizePointerRef = useRef<{ pointerId: number; startX: number; startY: number; startSize: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const grabPointerRef = useRef<{ pointerId: number; startLeft: number; startTop: number; startX: number; startY: number } | null>(null);
  const lastScaleRef = useRef(100);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTool, setActiveTool] = useState<StoryEditorTool>('text');
  const [storyText, setStoryText] = useState('');
  const [textSize, setTextSize] = useState(72);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 });
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [isResizingText, setIsResizingText] = useState(false);
  const [isHoveringTextBox, setIsHoveringTextBox] = useState(false);
  const [altText, setAltText] = useState('');
  const [musicKeyword, setMusicKeyword] = useState('');
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(100);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [contentSize, setContentSize] = useState({ width: 360, height: 640 });
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [privacySetting, setPrivacySetting] = useState<'public' | 'friends' | 'custom'>('friends');
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);

  const handleOpenImagePicker = () => {
    imageInputRef.current?.click();
  };

  const handleImageSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedImage = event.target.files?.[0];
    if (!selectedImage) return;
    const nextImageUrl = URL.createObjectURL(selectedImage);
    setSelectedImageUrl((previousImageUrl) => {
      if (previousImageUrl) URL.revokeObjectURL(previousImageUrl);
      return nextImageUrl;
    });
    setSelectedImageFile(selectedImage);
    setActiveTool('text');
    setStoryText('');
    setImageScale(100);
    lastScaleRef.current = 100;
    event.target.value = '';
  };

  const handleRemoveSelectedImage = () => {
    setSelectedImageUrl((previousImageUrl) => {
      if (previousImageUrl) URL.revokeObjectURL(previousImageUrl);
      return null;
    });
    setSelectedImageFile(null);
    setSelectedTrackId(null);
    setMusicKeyword('');
    setStoryText('');
    setImageScale(100);
    lastScaleRef.current = 100;
  };

  const handleSubmitStory = async () => {
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để đăng tin');
      return;
    }
    if (!selectedImageFile && !storyText.trim()) {
      toast.error('Tin cần có ảnh hoặc văn bản');
      return;
    }
    try {
      setIsSubmitting(true);
      await storyService.createStory({
        userId: currentUser.id,
        image: selectedImageFile ?? undefined,
        textContent: storyText.trim() || undefined,
        textColor: storyText.trim() ? textColor : undefined,
        textSize: storyText.trim() ? textSize : undefined,
        textPosX: storyText.trim() ? textPosition.x : undefined,
        textPosY: storyText.trim() ? textPosition.y : undefined,
        musicTrackId: selectedTrackId ?? undefined,
        altText: altText.trim() || undefined,
      });
      toast.success('Đã đăng tin thành công!');
      navigate('/home');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể đăng tin');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
    };
  }, [selectedImageUrl]);

  useEffect(() => {
    const el = editableTextRef.current;
    if (!el || document.activeElement === el) return;
    if (el.innerText !== storyText) {
      el.innerText = storyText;
    }
  }, [storyText]);

  const hasSelectedImage = Boolean(selectedImageUrl);
  const filteredTracks = musicTracks.filter((track) =>
    `${track.title} ${track.artist}`.toLowerCase().includes(musicKeyword.toLowerCase())
  );
  const selectedTrack = musicTracks.find((track) => track.id === selectedTrackId);

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const oldScale = lastScaleRef.current;
    const newScale = imageScale;
    if (oldScale === newScale) return;

    const ratio = newScale / oldScale;
    const viewportW = container.clientWidth;
    const viewportH = container.clientHeight;

    // Maintain center point during zoom
    const targetScrollLeft = (container.scrollLeft + viewportW / 2) * ratio - viewportW / 2;
    const targetScrollTop = (container.scrollTop + viewportH / 2) * ratio - viewportH / 2;

    container.scrollLeft = targetScrollLeft;
    container.scrollTop = targetScrollTop;
    lastScaleRef.current = newScale;
  }, [imageScale]);

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    const frameW = 360;
    const frameH = 640;
    const ratio = Math.min(frameW / naturalWidth, frameH / naturalHeight);
    setContentSize({
      width: naturalWidth * ratio,
      height: naturalHeight * ratio,
    });
  };

  const handleScrollPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Check if there is anything to scroll
    const isScrollable = container.scrollWidth > container.clientWidth || container.scrollHeight > container.clientHeight;
    if (!isScrollable) return;

    container.setPointerCapture(event.pointerId);
    grabPointerRef.current = {
      pointerId: event.pointerId,
      startLeft: container.scrollLeft,
      startTop: container.scrollTop,
      startX: event.clientX,
      startY: event.clientY,
    };
    setIsGrabbing(true);
  };

  const handleScrollPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const grab = grabPointerRef.current;
    if (!grab || grab.pointerId !== event.pointerId) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const dx = event.clientX - grab.startX;
    const dy = event.clientY - grab.startY;

    container.scrollLeft = grab.startLeft - dx;
    container.scrollTop = grab.startTop - dy;
  };

  const handleScrollPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const grab = grabPointerRef.current;
    if (!grab || grab.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    grabPointerRef.current = null;
    setIsGrabbing(false);
  };

  const updateTextPositionByDelta = (deltaX: number, deltaY: number) => {
    const previewFrame = previewFrameRef.current;
    if (!previewFrame) return;

    setTextPosition((previous) => ({
      x: clamp(previous.x + (deltaX / previewFrame.clientWidth) * 100, 5, 95),
      y: clamp(previous.y + (deltaY / previewFrame.clientHeight) * 100, 5, 95),
    }));
  };

  const handleTextPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool !== 'text' || isEditingText || isResizingText) return;
    if (event.button !== 0) return;
    dragPointerRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, moved: false };
  };

  const handleTextPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const pointerState = dragPointerRef.current;
    if (!pointerState || pointerState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - pointerState.clientX;
    const deltaY = event.clientY - pointerState.clientY;
    const distance = Math.hypot(deltaX, deltaY);
    if (!isDraggingText && distance > 3) {
      setIsDraggingText(true);
      dragPointerRef.current = { ...pointerState, moved: true, clientX: event.clientX, clientY: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    dragPointerRef.current = { ...pointerState, clientX: event.clientX, clientY: event.clientY };
    if (isDraggingText || pointerState.moved) {
      updateTextPositionByDelta(deltaX, deltaY);
    }
  };

  const handleTextPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const pointerState = dragPointerRef.current;
    const wasDragging = isDraggingText || Boolean(pointerState?.moved);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragPointerRef.current = null;
    setIsDraggingText(false);

    if (!wasDragging && activeTool === 'text') {
      handleEnableTextEdit();
    }
  };

  const handleResizePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (activeTool !== 'text' || isEditingText || isDraggingText) return;
    resizePointerRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startSize: textSize,
    };
    setIsResizingText(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const resizeState = resizePointerRef.current;
    if (!resizeState || resizeState.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - resizeState.startX;
    const deltaY = resizeState.startY - event.clientY;
    setTextSize(clamp(Math.round(resizeState.startSize + (deltaX + deltaY) * 0.35), 24, 140));
  };

  const handleResizePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const resizeState = resizePointerRef.current;
    if (!resizeState || resizeState.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resizePointerRef.current = null;
    setIsResizingText(false);
  };

  const handleEnableTextEdit = () => {
    if (activeTool !== 'text') return;
    setIsEditingText(true);
    requestAnimationFrame(() => {
      editableTextRef.current?.focus();
    });
  };

  const handleStoryTextInput = (event: React.FormEvent<HTMLDivElement>) => {
    setStoryText(event.currentTarget.innerText ?? '');
  };

  const handleAddText = () => {
    setActiveTool('text');
    if (storyText.trim().length > 0) {
      handleEnableTextEdit();
      return;
    }
    setStoryText('Văn bản');
    setTextPosition({ x: 50, y: 50 });
    window.setTimeout(() => {
      handleEnableTextEdit();
    }, 0);
  };

  const handleClearText = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (editableTextRef.current) {
      editableTextRef.current.innerText = '';
      editableTextRef.current.blur();
    }
    dragPointerRef.current = null;
    resizePointerRef.current = null;
    setStoryText('');
    setIsEditingText(false);
    setIsHoveringTextBox(false);
    setIsDraggingText(false);
    setIsResizingText(false);
  };

  return (
    <div className="h-screen bg-[#f0f2f5] overflow-hidden">
      <div className="flex h-full w-full overflow-hidden">
        <aside className="relative w-[320px] shrink-0 border-r border-gray-200 bg-white pb-16 flex flex-col">
          <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-3">
            <button
              type="button"
              onClick={() => setIsDiscardModalOpen(true)}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Tin của bạn</h1>
            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(true)}
              className="ml-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200"
              aria-label="Cài đặt"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>

          <div className="px-5 py-4">
            <div className="mb-4 flex items-center gap-3 rounded-lg px-2 py-2">
              <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-300">
                <img
                  src={userAvatar}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="font-medium text-gray-900">{userFullName}</span>
            </div>

            {hasSelectedImage && (
              <div className="space-y-1 border-t border-gray-200 pt-3">
                <button
                  type="button"
                  onClick={handleAddText}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-gray-900 transition hover:bg-gray-100 ${
                    activeTool === 'text' ? 'bg-gray-100' : ''
                  }`}
                >
                  <Type className="h-5 w-5" />
                  <span className="text-sm font-medium">Thêm văn bản</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool('music')}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-gray-900 transition hover:bg-gray-100 ${
                    activeTool === 'music' ? 'bg-gray-100' : ''
                  }`}
                >
                  <Music className="h-5 w-5" />
                  <span className="text-sm font-medium">Thêm nhạc</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool('alt-text')}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-gray-900 transition hover:bg-gray-100 ${
                    activeTool === 'alt-text' ? 'bg-gray-100' : ''
                  }`}
                >
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm font-medium">Văn bản thay thế</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool('image')}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-gray-900 transition hover:bg-gray-100 ${
                    activeTool === 'image' ? 'bg-gray-100' : ''
                  }`}
                >
                  <Crop className="h-5 w-5" />
                  <span className="text-sm font-medium">Kích thước ảnh</span>
                </button>
              </div>
            )}

            {hasSelectedImage && activeTool === 'alt-text' && (
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-gray-600">
                  Sử dụng văn bản thay thế để mô tả nội dung ảnh cho người dùng hỗ trợ tiếp cận.
                </p>
                <textarea
                  value={altText}
                  onChange={(event) => setAltText(event.target.value)}
                  placeholder="Văn bản thay thế tùy chỉnh"
                  className="h-24 w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
            )}

            {hasSelectedImage && activeTool === 'image' && (
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-gray-600">
                  Sử dụng thanh trượt bên dưới ảnh preview để thu phóng và di chuyển ảnh.
                </p>
                <div className="pt-2 text-center">
                  <button 
                    type="button" 
                    onClick={() => {
                      setImageScale(100);
                      lastScaleRef.current = 100;
                    }}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer transition underline"
                  >
                     Khôi phục mặc định
                  </button>
                </div>
              </div>
            )}

            {hasSelectedImage && activeTool === 'text' && (
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-gray-600">Click chữ để sửa, giữ rồi kéo để di chuyển, hover text để hiện 4 góc kéo kích thước.</p>
                <div>
                  <p className="mb-2 text-xs font-medium text-gray-600">Màu chữ</p>
                  <div className="flex flex-wrap gap-2">
                    {textColorPalette.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setTextColor(color)}
                        className={`h-6 w-6 cursor-pointer rounded-full border-2 transition ${
                          textColor === color ? 'border-blue-500' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Chọn màu chữ ${color}`}
                        title={`Chọn màu chữ ${color}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={24}
                    max={96}
                    value={textSize}
                    onChange={(event) => setTextSize(Number(event.target.value))}
                    aria-label="Chỉnh kích thước văn bản"
                    title="Chỉnh kích thước văn bản"
                    className="w-full"
                  />
                  <span className="w-12 text-right text-xs text-gray-600">{textSize}px</span>
                </div>
              </div>
            )}
          </div>

          {hasSelectedImage && (
            <div className="absolute right-0 bottom-0 left-0 flex gap-3 border-t border-gray-200 bg-white px-4 py-3">
              <button
                type="button"
                className="flex-1 cursor-pointer rounded-md bg-gray-200 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-300"
                onClick={() => setIsDiscardModalOpen(true)}
              >
                Bỏ
              </button>
              <button
                type="button"
                onClick={handleSubmitStory}
                disabled={isSubmitting}
                className="flex-1 cursor-pointer rounded-md bg-blue-600 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Đang đăng...' : 'Chia sẻ lên tin'}
              </button>
            </div>
          )}
        </aside>

        <main className="flex flex-1 items-center justify-center p-6 overflow-hidden">
          {!hasSelectedImage ? (
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleOpenImagePicker}
                className="group relative h-[320px] w-[190px] cursor-pointer overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-indigo-500 to-sky-400 text-white shadow-md transition hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-black/5" />
                <div className="relative flex h-full flex-col items-center justify-center gap-4 px-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-900 shadow">
                    <Camera className="h-5 w-5" />
                  </div>
                  <p className="text-center text-sm font-semibold">Tạo tin dạng ảnh</p>
                </div>
              </button>

              <button
                type="button"
                className="group relative h-[320px] w-[190px] cursor-pointer overflow-hidden rounded-xl bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500 text-white shadow-md transition hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-black/5" />
                <div className="relative flex h-full flex-col items-center justify-center gap-4 px-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-900 shadow">
                    <Type className="h-5 w-5" />
                  </div>
                  <p className="text-center text-sm font-semibold">Tạo tin dạng văn bản</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="w-full max-w-[900px] rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
              <p className="mb-3 text-sm text-gray-700">Xem trước</p>
              <div className="relative flex h-[660px] items-center justify-center rounded-lg bg-[#18191a] overflow-hidden">
                <div
                  className="relative overflow-hidden rounded-md shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-transparent"
                  style={{ width: '360px', height: '640px' }}
                  ref={previewFrameRef}
                >
                  <div className="absolute inset-0 touch-none">
                    {/* 🔥 BACKGROUND BLUR */}
                    <div
                      className="absolute inset-[1px] scale-125 pointer-events-none"
                      style={{
                        backgroundImage: `url(${selectedImageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'blur(40px) brightness(0.7)',
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40" />

                    {/* 🔥 SCROLL CONTAINER */}
                    <div
                      ref={scrollContainerRef}
                      className={`absolute inset-0 overflow-auto scrollbar-none touch-none select-none bg-transparent ${
                        imageScale > 100 || (scrollContainerRef.current && (scrollContainerRef.current.scrollWidth > scrollContainerRef.current.clientWidth || scrollContainerRef.current.scrollHeight > scrollContainerRef.current.clientHeight)) 
                        ? (isGrabbing ? 'cursor-grabbing' : 'cursor-grab') : ''
                      }`}
                      onPointerDown={handleScrollPointerDown}
                      onPointerMove={handleScrollPointerMove}
                      onPointerUp={handleScrollPointerUp}
                      onPointerCancel={handleScrollPointerUp}
                    >
                      <div 
                        className="flex items-center justify-center min-w-full min-h-full bg-transparent"
                        style={{
                          width: `${(contentSize.width * imageScale) / 100}px`,
                          height: `${(contentSize.height * imageScale) / 100}px`,
                          margin: 'auto'
                        }}
                      >
                        <img
                          src={selectedImageUrl ?? ''}
                          alt="Story preview"
                          onLoad={handleImageLoad}
                          className="select-none outline-none max-w-none"
                          style={{
                            width: `${(contentSize.width * imageScale) / 100}px`,
                            height: `${(contentSize.height * imageScale) / 100}px`,
                            objectFit: 'contain',
                            pointerEvents: 'none'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {(storyText.length > 0 || isEditingText) && (
                    <div
                      role="presentation"
                      className={`absolute -translate-x-1/2 -translate-y-1/2 ${isDraggingText ? 'cursor-grabbing' : 'cursor-move'}`}
                      onPointerDown={handleTextPointerDown}
                      onPointerMove={handleTextPointerMove}
                      onPointerUp={handleTextPointerUp}
                      onPointerCancel={handleTextPointerUp}
                      onMouseEnter={() => setIsHoveringTextBox(true)}
                      onMouseLeave={() => setIsHoveringTextBox(false)}
                      style={{ left: `${textPosition.x}%`, top: `${textPosition.y}%` }}
                    >
                      <div
                        ref={editableTextRef}
                        contentEditable={activeTool === 'text' && isEditingText}
                        suppressContentEditableWarning
                        onFocus={() => setIsEditingText(true)}
                        onBlur={() => setIsEditingText(false)}
                        onInput={handleStoryTextInput}
                        className="relative min-w-[32px] px-2 text-center font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] outline-none"
                        style={{
                          fontSize: `${textSize}px`,
                          color: textColor,
                          lineHeight: 1.05,
                          minHeight: '1.2em',
                          minWidth: '1ch',
                        }}
                      >
                      </div>
                      {activeTool === 'text' && !isEditingText && !isDraggingText && (isHoveringTextBox || isResizingText) && (
                        <>
                          <div className="pointer-events-none absolute inset-0 rounded-sm border border-white/90" />
                          <button
                            type="button"
                            className="absolute -top-5 -left-5 z-20 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white bg-white text-gray-700 shadow hover:bg-gray-100"
                            onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
                              event.stopPropagation();
                              handleClearText(event as any);
                            }}
                            aria-label="Xóa văn bản"
                            title="Xóa văn bản"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <div
                            role="presentation"
                            className="absolute -left-2 -top-2 h-3.5 w-3.5 cursor-pointer rounded-full border border-white bg-blue-500 shadow cursor-nwse-resize"
                            onPointerDown={handleResizePointerDown}
                            onPointerMove={handleResizePointerMove}
                            onPointerUp={handleResizePointerUp}
                            onPointerCancel={handleResizePointerUp}
                          />
                          <div
                            role="presentation"
                            className="absolute -right-2 -top-2 h-3.5 w-3.5 cursor-pointer rounded-full border border-white bg-blue-500 shadow cursor-nesw-resize"
                            onPointerDown={handleResizePointerDown}
                            onPointerMove={handleResizePointerMove}
                            onPointerUp={handleResizePointerUp}
                            onPointerCancel={handleResizePointerUp}
                          />
                          <div
                            role="presentation"
                            className="absolute -left-2 -bottom-2 h-3.5 w-3.5 cursor-pointer rounded-full border border-white bg-blue-500 shadow cursor-nesw-resize"
                            onPointerDown={handleResizePointerDown}
                            onPointerMove={handleResizePointerMove}
                            onPointerUp={handleResizePointerUp}
                            onPointerCancel={handleResizePointerUp}
                          />
                          <div
                            role="presentation"
                            className="absolute -right-2 -bottom-2 h-3.5 w-3.5 cursor-pointer rounded-full border border-white bg-blue-500 shadow cursor-nwse-resize"
                            onPointerDown={handleResizePointerDown}
                            onPointerMove={handleResizePointerMove}
                            onPointerUp={handleResizePointerUp}
                            onPointerCancel={handleResizePointerUp}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>

                {activeTool === 'image' && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-6 py-3 rounded-full bg-black/60 backdrop-blur-md border border-white/20 shadow-xl w-[320px]">
                    <span className="text-xs font-bold text-white/90 shrink-0">Zoom</span>
                    <input
                      type="range"
                      min={10}
                      max={400}
                      value={imageScale}
                      onChange={(event) => setImageScale(Number(event.target.value))}
                      className="flex-1 accent-blue-500 h-1 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs font-mono font-bold text-white w-10 text-right">{imageScale}%</span>
                  </div>
                )}

                {activeTool === 'music' && (
                  <div className="absolute top-6 right-6 w-[280px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
                    <div className="mb-3 flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2">
                      <Search className="h-4 w-4 text-gray-500" />
                      <input
                        value={musicKeyword}
                        onChange={(event) => setMusicKeyword(event.target.value)}
                        placeholder="Tìm kiếm nhạc"
                        className="w-full bg-transparent text-sm outline-none"
                      />
                    </div>
                    <div className="max-h-[360px] space-y-1 overflow-y-auto">
                      {filteredTracks.map((track) => {
                        const isSelected = selectedTrackId === track.id;
                        return (
                          <button
                            key={track.id}
                            type="button"
                            onClick={() => setSelectedTrackId(track.id)}
                            className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left transition ${
                              isSelected ? 'bg-blue-50' : 'hover:bg-gray-100'
                            }`}
                          >
                            <div className="h-8 w-8 rounded bg-gray-200" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-gray-900">{track.title}</p>
                              <p className="truncate text-[11px] text-gray-500">{track.artist}</p>
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 space-y-3">
                {selectedTrack && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                    Nhạc đã chọn: <span className="font-semibold">{selectedTrack.title}</span> - {selectedTrack.artist}
                  </div>
                )}
              </div>
            </div>
          )}

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelected}
            aria-label="Chọn ảnh để tạo tin"
            title="Chọn ảnh để tạo tin"
            className="hidden"
          />
        </main>
      </div>

      {/* 🔥 PRIVACY MODAL */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="w-full max-w-[500px] overflow-hidden rounded-xl bg-white shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="relative border-b border-gray-200 px-4 py-4 text-center">
              <h2 className="text-xl font-bold text-gray-900">Quyền riêng tư của tin</h2>
              <button 
                onClick={() => setIsPrivacyModalOpen(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-4 py-4">
              <div className="mb-4">
                <h3 className="text-base font-bold text-gray-900">Ai có thể xem tin của bạn?</h3>
                <p className="text-sm text-gray-500">Tin của bạn sẽ hiển thị trên KConnecta trong 24 giờ.</p>
              </div>

              <div className="space-y-1">
                {/* Option: Public */}
                <button
                  type="button"
                  onClick={() => setPrivacySetting('public')}
                  className="flex w-full items-center gap-4 rounded-lg px-2 py-3 transition hover:bg-gray-50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-gray-700">
                    <Globe className="h-6 w-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-gray-900">Công khai</p>
                    <p className="text-xs text-gray-500">Bất kỳ ai trên KConnecta</p>
                  </div>
                  <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${privacySetting === 'public' ? 'border-blue-600' : 'border-gray-300'}`}>
                    {privacySetting === 'public' && <div className="h-3 w-3 rounded-full bg-blue-600" />}
                  </div>
                </button>

                {/* Option: Friends */}
                <button
                  type="button"
                  onClick={() => setPrivacySetting('friends')}
                  className="flex w-full items-center gap-4 rounded-lg px-2 py-3 transition hover:bg-gray-50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-gray-700">
                    <Users className="h-6 w-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-gray-900">Bạn bè</p>
                    <p className="text-xs text-gray-500">Chỉ bạn bè của bạn trên KConnecta</p>
                  </div>
                  <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${privacySetting === 'friends' ? 'border-blue-600' : 'border-gray-300'}`}>
                    {privacySetting === 'friends' && <div className="h-3 w-3 rounded-full bg-blue-600" />}
                  </div>
                </button>

                {/* Option: Custom */}
                <button
                  type="button"
                  onClick={() => setPrivacySetting('custom')}
                  className="flex w-full items-center gap-4 rounded-lg px-2 py-3 transition hover:bg-gray-50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-gray-700">
                    <UserPlus className="h-6 w-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-gray-900">Tùy chỉnh</p>
                    <p className="text-xs text-gray-500">Chọn đối tượng cho tin của bạn</p>
                  </div>
                  <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${privacySetting === 'custom' ? 'border-blue-600' : 'border-gray-300'}`}>
                    {privacySetting === 'custom' && <div className="h-3 w-3 rounded-full bg-blue-600" />}
                  </div>
                </button>
              </div>

              <div className="my-4 border-t border-gray-100 pt-2">
                <button
                   type="button"
                   className="flex w-full items-center gap-4 rounded-lg px-2 py-3 transition hover:bg-gray-50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-gray-700">
                    <Users className="h-6 w-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-gray-900">Ẩn tin với</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-4 py-4">
              <button
                onClick={() => setIsPrivacyModalOpen(false)}
                className="px-6 py-2 text-sm font-bold text-blue-600 transition hover:bg-blue-50 rounded-md"
              >
                Hủy
              </button>
              <button
                onClick={() => setIsPrivacyModalOpen(false)}
                className="rounded-md bg-blue-600 px-8 py-2 text-sm font-bold text-white transition hover:bg-blue-700 shadow-md"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 DISCARD CONFIRMATION MODAL */}
      {isDiscardModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="w-full max-w-[450px] overflow-hidden rounded-xl bg-white shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="relative border-b border-gray-200 px-4 py-4 text-center">
              <h2 className="text-xl font-bold text-gray-900">Bỏ tin?</h2>
              <button 
                onClick={() => setIsDiscardModalOpen(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <p className="text-base text-gray-700 font-medium">
                Bạn có chắc chắn muốn bỏ tin này không? Hệ thống sẽ không lưu tin của bạn.
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end items-center gap-6 px-4 py-4">
              <button
                onClick={() => setIsDiscardModalOpen(false)}
                className="text-sm font-bold text-blue-600 transition hover:underline"
              >
                Tiếp tục chỉnh sửa
              </button>
              <button
                onClick={() => {
                  handleRemoveSelectedImage();
                  navigate('/home');
                }}
                className="rounded-lg bg-blue-600 px-10 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 shadow-md"
              >
                Bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
