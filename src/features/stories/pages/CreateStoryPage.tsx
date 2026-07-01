import React, { useEffect, useRef, useState, type ChangeEvent, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { Camera, Check, ChevronRight, Clock, Crop, Globe, Lock, Sparkles, Type, UserPlus, Users, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { authService, AuthUser, AUTH_USER_CHANGED_EVENT } from '@/services/authService';
import { useCreateStoryMutation } from '@/features/stories/hooks/useStories';
import type { StoryDurationHours, StoryPrivacy } from '@/services/storyService';
import { estimateStoryTextSize } from '@/lib/storyShareText';
import bgImg1 from './backgroundImage/000ecac94d4fa09a8369747056ce72f0.jpg';
import bgImg2 from './backgroundImage/2886e1de8d8637a139478d903feb0643.jpg';
import bgImg3 from './backgroundImage/60b39f8c265cc15e17009e2b539249c7.jpg';
import bgImg4 from './backgroundImage/84f90761646e060beb685c3a51c65e5e.jpg';
import bgImg5 from './backgroundImage/992d312079803e982fed2aa32d3f6992.jpg';
import bgImg6 from './backgroundImage/bb693fb7f6b569c4821a018d9bdcf242.jpg';
import bgImg7 from './backgroundImage/e46e6b20a5944479a9ee44cbb495567c.jpg';

type StoryEditorTool = 'text' | 'alt-text' | 'image' | 'background' | 'filter' | 'sticker';

const COLOR_FILTERS = [
  { id: 'none',     label: 'Gốc',      style: '' },
  { id: 'warm',     label: 'Ấm',       style: 'bg-orange-400/30' },
  { id: 'cool',     label: 'Lạnh',     style: 'bg-emerald-400/30' },
  { id: 'vintage',  label: 'Vintage',  style: 'bg-yellow-700/25 mix-blend-multiply' },
  { id: 'dark',     label: 'Tối',      style: 'bg-black/35' },
  { id: 'pink',     label: 'Hồng',     style: 'bg-pink-400/30' },
  { id: 'green',    label: 'Xanh lá',  style: 'bg-green-400/25' },
  { id: 'mono',     label: 'Xám',      style: 'bg-muted0/40 mix-blend-color' },
] as const;
type FilterId = typeof COLOR_FILTERS[number]['id'];

interface StickerItem { id: string; emoji: string; x: number; y: number; size: number; }

const textColorPalette = [
  '#FFFFFF',
  '#000000',
  '#374151',
  '#9CA3AF',
  '#FECACA',
  '#F43F5E',
  '#EF4444',
  '#DC2626',
  '#FDA4AF',
  '#EC4899',
  '#F472B6',
  '#FDE68A',
  '#FBBF24',
  '#F59E0B',
  '#F97316',
  '#FED7AA',
  '#A3E635',
  '#22C55E',
  '#4ADE80',
  '#6EE7B7',
  '#5EEAD4',
  '#22D3EE',
  '#38BDF8',
  '#3B82F6',
  '#60A5FA',
  '#818CF8',
  '#8B5CF6',
  '#C084FC',
  '#E879F9',
  '#F0ABFC',
  '#E7C6A8',
  '#A8A29E',
];

const STORY_DURATION_OPTIONS: Array<{ value: StoryDurationHours; label: string; sub: string }> = [
  { value: 3, label: '3 giờ', sub: 'Tin biến mất sau 3 giờ' },
  { value: 6, label: '6 giờ', sub: 'Tin biến mất sau 6 giờ' },
  { value: 12, label: '12 giờ', sub: 'Tin biến mất sau 12 giờ' },
  { value: 24, label: '1 ngày', sub: 'Tin biến mất sau 24 giờ' },
];

function formatStoryDurationLabel(hours: StoryDurationHours): string {
  return STORY_DURATION_OPTIONS.find((option) => option.value === hours)?.label ?? '1 ngày';
}

type StoryPrivacySetting = 'public' | 'friends' | 'only_me';

function mapStoryPrivacyToApi(
  privacy: StoryPrivacySetting,
): { privacy: StoryPrivacy } {
  switch (privacy) {
    case 'friends':
      return { privacy: 'FRIENDS' };
    case 'only_me':
      return { privacy: 'ONLY_ME' };
    default:
      return { privacy: 'PUBLIC' };
  }
}

function getStoryPrivacyLabel(privacy: StoryPrivacySetting): string {
  switch (privacy) {
    case 'public':
      return 'Công khai';
    case 'only_me':
      return 'Chỉ mình tôi';
    case 'friends':
    default:
      return 'Bạn bè';
  }
}

function getStoryPrivacySubtext(privacy: StoryPrivacySetting): string {
  switch (privacy) {
    case 'public':
      return 'Tất cả mọi người';
    case 'only_me':
      return 'Chỉ bạn mới thấy trên tin của mình';
    case 'friends':
    default:
      return 'Tất cả bạn bè của bạn';
  }
}

const bgImagePresets = [bgImg1, bgImg2, bgImg3, bgImg4, bgImg5, bgImg6, bgImg7];

const bgPresets: Array<{ id: string; type: 'gradient' | 'solid'; value: string }> = [
  { id: 'purple-pink',   type: 'gradient', value: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)' },
  { id: 'blue-purple',   type: 'gradient', value: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' },
  { id: 'cyan-blue',     type: 'gradient', value: 'linear-gradient(135deg, #0891b2 0%, #2563eb 100%)' },
  { id: 'green-teal',    type: 'gradient', value: 'linear-gradient(135deg, #16a34a 0%, #0d9488 100%)' },
  { id: 'yellow-green',  type: 'gradient', value: 'linear-gradient(135deg, #ca8a04 0%, #16a34a 100%)' },
  { id: 'orange-yellow', type: 'gradient', value: 'linear-gradient(135deg, #ea580c 0%, #ca8a04 100%)' },
  { id: 'red-orange',    type: 'gradient', value: 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)' },
  { id: 'pink-red',      type: 'gradient', value: 'linear-gradient(135deg, #db2777 0%, #dc2626 100%)' },
  { id: 'midnight',      type: 'gradient', value: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' },
  { id: 'slate',         type: 'gradient', value: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)' },
  { id: 'black',         type: 'solid',    value: '#000000' },
  { id: 'white',         type: 'solid',    value: '#FFFFFF' },
];

interface BgState {
  type: 'image' | 'gradient' | 'solid';
  value: string; // image src | gradient CSS | hex color
}

const DEFAULT_BG: BgState = { type: 'gradient', value: bgPresets[0].value };

function getBgStyle(bg: BgState): React.CSSProperties {
  if (bg.type === 'image') {
    return {
      backgroundImage: `url(${bg.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }
  if (bg.type === 'gradient') {
    return { backgroundImage: bg.value };
  }
  return { backgroundColor: bg.value };
}

export function CreateStoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const createStory = useCreateStoryMutation();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());

  useEffect(() => {
    const syncAuthUser = () => setCurrentUser(authService.getCurrentUser());
    window.addEventListener(AUTH_USER_CHANGED_EVENT, syncAuthUser);
    window.addEventListener('storage', syncAuthUser);
    return () => {
      window.removeEventListener(AUTH_USER_CHANGED_EVENT, syncAuthUser);
      window.removeEventListener('storage', syncAuthUser);
    };
  }, []);

  const userAvatar = currentUser?.avatarUrl || 'https://i.pravatar.cc/80?img=14';
  const userFullName = currentUser?.fullName || 'Khang Nguyen';

  // State from share-to-story: a remote image URL or plain text pre-filled from a post
  const sharedImageUrl = (location.state as { sharedImageUrl?: string | null; sharedText?: string | null; sharedIsLive?: boolean; sharedPostId?: string | null } | null)?.sharedImageUrl ?? null;
  const sharedText = (location.state as { sharedImageUrl?: string | null; sharedText?: string | null; sharedIsLive?: boolean; sharedPostId?: string | null } | null)?.sharedText ?? null;
  const sharedIsLive = (location.state as { sharedIsLive?: boolean } | null)?.sharedIsLive ?? false;
  const linkedPostId = (location.state as { sharedPostId?: string | null } | null)?.sharedPostId ?? null;

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
  const [isTextStoryMode, setIsTextStoryMode] = useState(false);

  const [activeTool, setActiveTool] = useState<StoryEditorTool>('text');
  const [storyText, setStoryText] = useState('');
  const [textSize, setTextSize] = useState(72);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 });
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [isPlaceholderText, setIsPlaceholderText] = useState(false);
  const [isResizingText, setIsResizingText] = useState(false);
  const [isHoveringTextBox, setIsHoveringTextBox] = useState(false);
  const [altText, setAltText] = useState('');
  const [imageScale, setImageScale] = useState(100);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [contentSize, setContentSize] = useState({ width: 360, height: 640 });
  const [colorFilter, setColorFilter] = useState<FilterId>('none');
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [draggingStickerId, setDraggingStickerId] = useState<string | null>(null);
  const stickerDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [privacySetting, setPrivacySetting] = useState<StoryPrivacySetting>('public');
  const [isPrivacyDropdownOpen, setIsPrivacyDropdownOpen] = useState(false);
  const [storyDurationHours, setStoryDurationHours] = useState<StoryDurationHours>(24);
  const [isDurationDropdownOpen, setIsDurationDropdownOpen] = useState(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [selectedBg, setSelectedBg] = useState<BgState>(DEFAULT_BG);

  // Pre-load from "Share to Story" navigation state (runs once on mount)
  useEffect(() => {
    if (sharedImageUrl) {
      setSelectedImageUrl(sharedImageUrl);
      // selectedImageFile stays null — we'll pass sharedImageUrl to the API
      setActiveTool('text');
      setStoryText('');
    } else if (sharedText) {
      const normalizedText = sharedText.trim();
      const fittedSize = estimateStoryTextSize(normalizedText);
      setIsTextStoryMode(true);
      setActiveTool('background');
      setStoryText(normalizedText);
      setTextSize(fittedSize);
      setTextPosition({ x: 50, y: sharedIsLive ? 46 : 50 });
      setSelectedBg(sharedIsLive ? { type: 'gradient', value: bgPresets[0].value } : DEFAULT_BG);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenImagePicker = () => {
    imageInputRef.current?.click();
  };

  const handleImageSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedImage = event.target.files?.[0];
    if (!selectedImage) return;
    const nextImageUrl = URL.createObjectURL(selectedImage);
    setSelectedImageUrl((previousImageUrl) => {
      if (previousImageUrl?.startsWith('blob:')) URL.revokeObjectURL(previousImageUrl);
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
      if (previousImageUrl?.startsWith('blob:')) URL.revokeObjectURL(previousImageUrl);
      return null;
    });
    setSelectedImageFile(null);
    setStoryText('');
    setImageScale(100);
    lastScaleRef.current = 100;
    setIsTextStoryMode(false);
  };

  const handleCreateTextStory = () => {
    setIsTextStoryMode(true);
    setActiveTool('background');
    setStoryText('');
    setIsPlaceholderText(false);
    setTextPosition({ x: 50, y: 50 });
    setSelectedBg(DEFAULT_BG);
  };

  const handleSubmitStory = () => {
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để đăng tin');
      return;
    }
    if (!selectedImageFile && !selectedImageUrl && !isTextStoryMode) {
      toast.error('Tin cần có ảnh hoặc văn bản');
      return;
    }

    const hasText = storyText.trim().length > 0 && !isPlaceholderText;

    const remoteImageUrl = !selectedImageFile && selectedImageUrl && !selectedImageUrl.startsWith('blob:')
      ? selectedImageUrl
      : undefined;

    const privacyPayload = mapStoryPrivacyToApi(privacySetting);

    createStory.mutate({
      userId: currentUser.id,
      image: selectedImageFile ?? undefined,
      sharedImageUrl: remoteImageUrl,
      textContent: hasText ? storyText.trim() : undefined,
      textColor: hasText ? textColor : undefined,
      textSize: hasText ? textSize : undefined,
      textPosX: hasText ? textPosition.x : undefined,
      textPosY: hasText ? textPosition.y : undefined,
      stickers: stickers.length > 0
        ? stickers.map(({ emoji, x, y, size }) => ({ emoji, x, y, size }))
        : undefined,
      altText: altText.trim() || undefined,
      backgroundColor: isTextStoryMode ? selectedBg.value : undefined,
      linkedPostId: linkedPostId ?? undefined,
      durationHours: storyDurationHours,
      privacy: privacyPayload.privacy,
    });

    navigate('/home');
  };

  useEffect(() => {
    return () => {
      if (selectedImageUrl?.startsWith('blob:')) URL.revokeObjectURL(selectedImageUrl);
    };
  }, [selectedImageUrl]);

  useEffect(() => {
    const el = editableTextRef.current;
    if (!el || document.activeElement === el) return;
    if (el.innerText !== storyText) {
      el.innerText = storyText;
    }
  }, [storyText]);

  const handlePrivacyButtonClick = () => {
    setIsDurationDropdownOpen(false);
    setIsPrivacyDropdownOpen((open) => !open);
  };

  const hasSelectedImage = Boolean(selectedImageUrl);
  const isActive = hasSelectedImage || isTextStoryMode;

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (lastScaleRef.current === imageScale) return;
    lastScaleRef.current = imageScale;

    // Center on image after every zoom change.
    // The formula (scrollLeft + W/2) * ratio - W/2 breaks when the content
    // wrapper is larger than the image (due to min-w/h-full flex-centering),
    // because the image origin shifts non-linearly. Direct centering is correct.
    requestAnimationFrame(() => {
      const c = scrollContainerRef.current;
      if (!c) return;
      const scaledW = (contentSize.width * imageScale) / 100;
      const scaledH = (contentSize.height * imageScale) / 100;
      c.scrollLeft = Math.max(0, (scaledW - c.clientWidth) / 2);
      c.scrollTop  = Math.max(0, (scaledH - c.clientHeight) / 2);
    });
  }, [imageScale, contentSize]);

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
    if (isPlaceholderText) {
      setStoryText('');
      setIsPlaceholderText(false);
      requestAnimationFrame(() => {
        if (editableTextRef.current) {
          editableTextRef.current.innerText = '';
          editableTextRef.current.focus();
        }
      });
      return;
    }
    setIsEditingText(true);
    requestAnimationFrame(() => {
      editableTextRef.current?.focus();
    });
  };

  const handleStoryTextInput = (event: React.FormEvent<HTMLDivElement>) => {
    const text = event.currentTarget.innerText ?? '';
    setStoryText(text);
    setIsPlaceholderText(false);
  };

  const handleAddSticker = (emoji: string) => {
    setStickers(prev => [...prev, {
      id: `sticker-${Date.now()}`,
      emoji,
      x: 40 + Math.random() * 20,
      y: 40 + Math.random() * 20,
      size: 48,
    }]);
  };

  const handleStickerPointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const sticker = stickers.find(s => s.id === id);
    if (!sticker || !previewFrameRef.current) return;
    const frame = previewFrameRef.current.getBoundingClientRect();
    stickerDragRef.current = { startX: e.clientX, startY: e.clientY, origX: sticker.x, origY: sticker.y };
    setDraggingStickerId(id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    void frame;
  };

  const handleStickerPointerMove = (e: React.PointerEvent, id: string) => {
    const drag = stickerDragRef.current;
    if (draggingStickerId !== id || !drag || !previewFrameRef.current) return;
    const frame = previewFrameRef.current.getBoundingClientRect();
    const dx = ((e.clientX - drag.startX) / frame.width) * 100;
    const dy = ((e.clientY - drag.startY) / frame.height) * 100;
    const nextX = Math.max(5, Math.min(95, drag.origX + dx));
    const nextY = Math.max(5, Math.min(95, drag.origY + dy));
    setStickers(prev => prev.map(s => s.id === id ? { ...s, x: nextX, y: nextY } : s));
  };

  const handleStickerPointerUp = (e: React.PointerEvent) => {
    stickerDragRef.current = null;
    setDraggingStickerId(null);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleRemoveSticker = (id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
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
        <aside className="relative w-[320px] shrink-0 border-r border-border bg-card pb-16 flex flex-col">
          <div className="flex items-center gap-3 border-b border-border px-5 py-3">
            <button
              type="button"
              onClick={() => setIsDiscardModalOpen(true)}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-foreground transition hover:bg-muted"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-foreground">Tin của bạn</h1>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
            <div className="mb-4 flex items-center gap-3 rounded-lg px-2 py-2">
              <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
                <img
                  src={userAvatar}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="font-medium text-foreground">{userFullName}</span>
            </div>

            {/* Privacy selector */}
            <div className="relative mb-3">
              <button
                type="button"
                onClick={handlePrivacyButtonClick}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 transition hover:border-border hover:bg-muted"
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-white transition-colors ${ privacySetting === 'public' ? 'bg-emerald-500' : privacySetting === 'only_me' ? 'bg-gray-400' : 'bg-green-500' }`}>
                  {privacySetting === 'public' && <Globe className="h-4 w-4" />}
                  {privacySetting === 'friends' && <Users className="h-4 w-4" />}
                  {privacySetting === 'only_me' && <Lock className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">
                    {getStoryPrivacyLabel(privacySetting)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {getStoryPrivacySubtext(privacySetting)}
                  </p>
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isPrivacyDropdownOpen ? 'rotate-90' : ''}`} />
              </button>

              {isPrivacyDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
                  {([
                    { value: 'public' as const, label: 'Công khai', sub: 'Tất cả mọi người', icon: <Globe className="h-4 w-4" />, color: 'bg-emerald-500' },
                    { value: 'friends' as const, label: 'Bạn bè', sub: 'Tất cả bạn bè của bạn', icon: <Users className="h-4 w-4" />, color: 'bg-green-500' },
                    { value: 'only_me' as const, label: 'Chỉ mình tôi', sub: 'Không hiển thị trên bảng tin', icon: <Lock className="h-4 w-4" />, color: 'bg-gray-400' },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setIsPrivacyDropdownOpen(false);
                        setPrivacySetting(opt.value);
                      }}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-muted ${ privacySetting === opt.value ? 'bg-background' : '' }`}
                    >
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full text-white ${opt.color}`}>
                        {opt.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.sub}</p>
                      </div>
                      {privacySetting === opt.value && <Check className="h-4 w-4 text-emerald-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Story duration selector */}
            <div className="relative mb-3">
              <button
                type="button"
                onClick={() => {
                  setIsDurationDropdownOpen((open) => !open);
                  setIsPrivacyDropdownOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 transition hover:border-border hover:bg-muted"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500 text-white">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">
                    Thời gian tồn tại: {formatStoryDurationLabel(storyDurationHours)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {STORY_DURATION_OPTIONS.find((option) => option.value === storyDurationHours)?.sub}
                  </p>
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isDurationDropdownOpen ? 'rotate-90' : ''}`} />
              </button>

              {isDurationDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
                  {STORY_DURATION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setStoryDurationHours(option.value);
                        setIsDurationDropdownOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-muted ${storyDurationHours === option.value ? 'bg-background' : ''}`}
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500 text-white">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.sub}</p>
                      </div>
                      {storyDurationHours === option.value && <Check className="h-4 w-4 text-emerald-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isActive && (
              <div className="space-y-1 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={handleAddText}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-foreground transition hover:bg-muted ${ activeTool === 'text' ? 'bg-background' : '' }`}
                >
                  <Type className="h-5 w-5" />
                  <span className="text-sm font-medium">Thêm văn bản</span>
                </button>
                {isTextStoryMode && (
                  <button
                    type="button"
                    onClick={() => setActiveTool('background')}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-foreground transition hover:bg-muted ${ activeTool === 'background' ? 'bg-background' : '' }`}
                  >
                    <Sparkles className="h-5 w-5" />
                    <span className="text-sm font-medium">Phông nền</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTool('sticker')}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-foreground transition hover:bg-muted ${activeTool === 'sticker' ? 'bg-background' : ''}`}
                >
                  <span className="text-lg leading-none">😊</span>
                  <span className="text-sm font-medium">Sticker</span>
                </button>
                {hasSelectedImage && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTool('filter')}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-foreground transition hover:bg-muted ${activeTool === 'filter' ? 'bg-background' : ''}`}
                    >
                      <Sparkles className="h-5 w-5" />
                      <span className="text-sm font-medium">Bộ lọc màu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTool('image')}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-foreground transition hover:bg-muted ${activeTool === 'image' ? 'bg-background' : ''}`}
                    >
                      <Crop className="h-5 w-5" />
                      <span className="text-sm font-medium">Kích thước ảnh</span>
                    </button>
                  </>
                )}
              </div>
            )}

            {hasSelectedImage && activeTool === 'alt-text' && (
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Sử dụng văn bản thay thế để mô tả nội dung ảnh cho người dùng hỗ trợ tiếp cận.
                </p>
                <textarea
                  value={altText}
                  onChange={(event) => setAltText(event.target.value)}
                  placeholder="Văn bản thay thế tùy chỉnh"
                  className="h-24 w-full resize-none rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {/* Sticker panel */}
            {activeTool === 'sticker' && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-muted-foreground">Nhấn để thêm vào tin</p>
                <Picker
                  data={data}
                  onEmojiSelect={(emoji: { native?: string }) => {
                    if (emoji.native) handleAddSticker(emoji.native);
                  }}
                  theme="light"
                  locale="vi"
                  previewPosition="none"
                  perLine={7}
                  emojiButtonSize={36}
                />
                {stickers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStickers([])}
                    className="mt-3 w-full rounded-lg border border-border py-1.5 text-xs text-muted-foreground transition hover:bg-muted"
                  >
                    Xóa tất cả sticker
                  </button>
                )}
              </div>
            )}

            {/* Filter panel */}
            {hasSelectedImage && activeTool === 'filter' && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-muted-foreground">Chọn bộ lọc màu</p>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_FILTERS.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setColorFilter(f.id)}
                      className={`flex flex-col items-center gap-1 rounded-lg p-1.5 transition hover:bg-muted ${colorFilter === f.id ? 'ring-2 ring-emerald-500' : ''}`}
                    >
                      <div className="relative h-12 w-full overflow-hidden rounded-md bg-muted">
                        <img src={selectedImageUrl ?? ''} alt="" className="h-full w-full object-cover" />
                        {f.style && <div className={`absolute inset-0 ${f.style}`} />}
                        {colorFilter === f.id && (
                          <div className="absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                            <Check className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasSelectedImage && activeTool === 'image' && (
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Sử dụng thanh trượt bên dưới ảnh preview để thu phóng và di chuyển ảnh.
                </p>
                <div className="pt-2 text-center">
                  <button 
                    type="button" 
                    onClick={() => {
                      setImageScale(100);
                      lastScaleRef.current = 100;
                    }}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 cursor-pointer transition underline"
                  >
                     Khôi phục mặc định
                  </button>
                </div>
              </div>
            )}

            {isActive && activeTool === 'text' && (
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-muted-foreground">Click chữ để sửa, giữ rồi kéo để di chuyển, hover text để hiện 4 góc kéo kích thước.</p>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Màu chữ</p>
                  <div className="flex flex-wrap gap-2">
                    {textColorPalette.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setTextColor(color)}
                        className={`h-6 w-6 cursor-pointer rounded-full border-2 transition ${ textColor === color ? 'border-emerald-500' : 'border-border' }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Chọn màu chữ ${color}`}
                        title={`Chọn màu chữ ${color}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isTextStoryMode && activeTool === 'background' && (
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Ảnh nền</p>
                  <div className="grid grid-cols-4 gap-2">
                    {bgImagePresets.map((src) => {
                      const isSelected = selectedBg.type === 'image' && selectedBg.value === src;
                      return (
                        <button
                          key={src}
                          type="button"
                          onClick={() => setSelectedBg({ type: 'image', value: src })}
                          className={`h-14 w-full cursor-pointer rounded-lg border-2 overflow-hidden transition-transform hover:scale-105 ${ isSelected ? 'border-emerald-500 shadow-md' : 'border-transparent' }`}
                          aria-label="Chọn ảnh nền"
                        >
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Màu nền</p>
                  <div className="grid grid-cols-4 gap-2">
                    {bgPresets.map((preset) => {
                      const isSelected = selectedBg.type === preset.type && selectedBg.value === preset.value;
                      const swatchStyle: React.CSSProperties = preset.type === 'gradient'
                        ? { backgroundImage: preset.value }
                        : { backgroundColor: preset.value };
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setSelectedBg({ type: preset.type, value: preset.value })}
                          className={`h-14 w-full cursor-pointer rounded-lg border-2 transition-transform hover:scale-105 ${ isSelected ? 'border-emerald-500 shadow-md' : 'border-transparent' }`}
                          style={swatchStyle}
                          aria-label={`Chọn phông nền ${preset.id}`}
                          title={preset.id}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {isActive && (
            <div className="absolute right-0 bottom-0 left-0 flex gap-3 border-t border-border bg-card px-4 py-3">
              <button
                type="button"
                className="flex-1 cursor-pointer rounded-md bg-muted py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                onClick={() => setIsDiscardModalOpen(true)}
              >
                Bỏ
              </button>
              <button
                type="button"
                onClick={handleSubmitStory}
                disabled={createStory.isPending}
                className="flex-1 cursor-pointer rounded-md bg-emerald-600 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {createStory.isPending ? 'Đang đăng...' : 'Chia sẻ lên tin'}
              </button>
            </div>
          )}
        </aside>

        <main className="flex flex-1 items-center justify-center p-6 overflow-hidden">
          {!isActive ? (
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleOpenImagePicker}
                className="group relative h-[320px] w-[190px] cursor-pointer overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-indigo-500 to-sky-400 text-white shadow-md transition hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-black/5" />
                <div className="relative flex h-full flex-col items-center justify-center gap-4 px-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground shadow">
                    <Camera className="h-5 w-5" />
                  </div>
                  <p className="text-center text-sm font-semibold">Tạo tin dạng ảnh</p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleCreateTextStory}
                className="group relative h-[320px] w-[190px] cursor-pointer overflow-hidden rounded-xl bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500 text-white shadow-md transition hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-black/5" />
                <div className="relative flex h-full flex-col items-center justify-center gap-4 px-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground shadow">
                    <Type className="h-5 w-5" />
                  </div>
                  <p className="text-center text-sm font-semibold">Tạo tin dạng văn bản</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="w-full max-w-[900px] rounded-lg border border-border bg-card p-3 shadow-sm dark:shadow-none">
              <p className="mb-3 text-sm text-foreground">Xem trước</p>
              <div className="relative flex h-[660px] items-center justify-center rounded-lg bg-[#18191a] overflow-hidden">
                <div
                  className="relative rounded-md shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-transparent"
                  style={{ width: '360px', height: '640px', overflow: 'clip' }}
                  ref={previewFrameRef}
                >
                  <div className="absolute inset-0 touch-none">
                    {isTextStoryMode ? (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={getBgStyle(selectedBg)}
                      />
                    ) : (
                      <>
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
                          className={`absolute inset-0 overflow-auto scrollbar-none touch-none select-none bg-transparent ${ imageScale > 100 || (scrollContainerRef.current && (scrollContainerRef.current.scrollWidth > scrollContainerRef.current.clientWidth || scrollContainerRef.current.scrollHeight > scrollContainerRef.current.clientHeight)) ? (isGrabbing ? 'cursor-grabbing' : 'cursor-grab') : '' }`}
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
                      </>
                    )}
                  </div>

                  {/* Color filter overlay */}
                  {colorFilter !== 'none' && (() => {
                    const f = COLOR_FILTERS.find(f => f.id === colorFilter);
                    return f ? <div className={`pointer-events-none absolute inset-0 z-10 rounded-md ${f.style}`} /> : null;
                  })()}

                  {/* Stickers */}
                  {stickers.map(s => (
                    <div
                      key={s.id}
                      className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 select-none ${draggingStickerId === s.id ? 'cursor-grabbing' : 'cursor-grab'}`}
                      style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: `${s.size}px`, lineHeight: 1 }}
                      onPointerDown={e => handleStickerPointerDown(e, s.id)}
                      onPointerMove={e => handleStickerPointerMove(e, s.id)}
                      onPointerUp={handleStickerPointerUp}
                      onPointerCancel={handleStickerPointerUp}
                    >
                      {s.emoji}
                      {activeTool === 'sticker' && (
                        <button
                          type="button"
                          className="absolute -right-2 -top-2 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white shadow"
                          onPointerDown={e => e.stopPropagation()}
                          onClick={() => handleRemoveSticker(s.id)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}

                  {(storyText.length > 0 || isEditingText) && (
                    <div
                      role="presentation"
                      className={`absolute max-w-[88%] -translate-x-1/2 -translate-y-1/2 ${isDraggingText ? 'cursor-grabbing' : 'cursor-move'}`}
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
                        className="relative w-full px-2 text-center font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] outline-none whitespace-pre-wrap break-words"
                        style={{
                          fontSize: `${textSize}px`,
                          color: textColor,
                          lineHeight: 1.2,
                          minHeight: '1.2em',
                          minWidth: '1ch',
                          opacity: isPlaceholderText ? 0.45 : 1,
                        }}
                      >
                      </div>
                      {activeTool === 'text' && !isEditingText && !isDraggingText && (isHoveringTextBox || isResizingText) && (
                        <>
                          <button
                            type="button"
                            className="absolute -top-5 -left-5 z-20 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white bg-card text-foreground shadow hover:bg-muted"
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
                            className="absolute -left-2 -top-2 h-3.5 w-3.5 cursor-pointer rounded-full border border-white bg-emerald-500 shadow cursor-nwse-resize"
                            onPointerDown={handleResizePointerDown}
                            onPointerMove={handleResizePointerMove}
                            onPointerUp={handleResizePointerUp}
                            onPointerCancel={handleResizePointerUp}
                          />
                          <div
                            role="presentation"
                            className="absolute -right-2 -top-2 h-3.5 w-3.5 cursor-pointer rounded-full border border-white bg-emerald-500 shadow cursor-nesw-resize"
                            onPointerDown={handleResizePointerDown}
                            onPointerMove={handleResizePointerMove}
                            onPointerUp={handleResizePointerUp}
                            onPointerCancel={handleResizePointerUp}
                          />
                          <div
                            role="presentation"
                            className="absolute -left-2 -bottom-2 h-3.5 w-3.5 cursor-pointer rounded-full border border-white bg-emerald-500 shadow cursor-nesw-resize"
                            onPointerDown={handleResizePointerDown}
                            onPointerMove={handleResizePointerMove}
                            onPointerUp={handleResizePointerUp}
                            onPointerCancel={handleResizePointerUp}
                          />
                          <div
                            role="presentation"
                            className="absolute -right-2 -bottom-2 h-3.5 w-3.5 cursor-pointer rounded-full border border-white bg-emerald-500 shadow cursor-nwse-resize"
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
                      className="flex-1 accent-emerald-500 h-1 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs font-mono font-bold text-white w-10 text-right">{imageScale}%</span>
                  </div>
                )}

                {activeTool === 'text' && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-6 py-3 rounded-full bg-black/60 backdrop-blur-md border border-white/20 shadow-xl w-[320px]">
                    <span className="text-xs font-bold text-white/90 shrink-0">Cỡ chữ</span>
                    <input
                      type="range"
                      min={24}
                      max={96}
                      value={textSize}
                      onChange={(event) => setTextSize(Number(event.target.value))}
                      aria-label="Chỉnh kích thước văn bản"
                      title="Chỉnh kích thước văn bản"
                      className="flex-1 accent-emerald-500 h-1 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs font-mono font-bold text-white w-10 text-right">{textSize}px</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-card/70 backdrop-blur-sm">
          <div className="w-full max-w-[500px] overflow-hidden rounded-xl bg-card shadow-2xl border border-border animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="relative border-b border-border px-4 py-4 text-center">
              <h2 className="text-xl font-bold text-foreground">Quyền riêng tư của tin</h2>
              <button 
                onClick={() => setIsPrivacyModalOpen(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-background text-muted-foreground transition hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-4 py-4">
              <div className="mb-4">
                <h3 className="text-base font-bold text-foreground">Ai có thể xem tin của bạn?</h3>
                <p className="text-sm text-muted-foreground">
                  Tin của bạn sẽ hiển thị trên KConnecta trong {formatStoryDurationLabel(storyDurationHours).toLowerCase()}.
                </p>
              </div>

              <div className="space-y-1">
                {/* Option: Public */}
                <button
                  type="button"
                  onClick={() => setPrivacySetting('public')}
                  className="flex w-full items-center gap-4 rounded-lg px-2 py-3 transition hover:bg-muted"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
                    <Globe className="h-6 w-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-foreground">Công khai</p>
                    <p className="text-xs text-muted-foreground">Bất kỳ ai trên KConnecta</p>
                  </div>
                  <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${privacySetting === 'public' ? 'border-emerald-600' : 'border-border'}`}>
                    {privacySetting === 'public' && <div className="h-3 w-3 rounded-full bg-emerald-600" />}
                  </div>
                </button>

                {/* Option: Friends */}
                <button
                  type="button"
                  onClick={() => setPrivacySetting('friends')}
                  className="flex w-full items-center gap-4 rounded-lg px-2 py-3 transition hover:bg-muted"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
                    <Users className="h-6 w-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-foreground">Bạn bè</p>
                    <p className="text-xs text-muted-foreground">Chỉ bạn bè của bạn trên KConnecta</p>
                  </div>
                  <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${privacySetting === 'friends' ? 'border-emerald-600' : 'border-border'}`}>
                    {privacySetting === 'friends' && <div className="h-3 w-3 rounded-full bg-emerald-600" />}
                  </div>
                </button>

                {/* Option: Custom */}
                <button
                  type="button"
                  onClick={() => setPrivacySetting('custom')}
                  className="flex w-full items-center gap-4 rounded-lg px-2 py-3 transition hover:bg-muted"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
                    <UserPlus className="h-6 w-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-foreground">Tùy chỉnh</p>
                    <p className="text-xs text-muted-foreground">Chọn đối tượng cho tin của bạn</p>
                  </div>
                  <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${privacySetting === 'custom' ? 'border-emerald-600' : 'border-border'}`}>
                    {privacySetting === 'custom' && <div className="h-3 w-3 rounded-full bg-emerald-600" />}
                  </div>
                </button>
              </div>

              <div className="my-4 border-t border-border pt-2">
                <button
                   type="button"
                   className="flex w-full items-center gap-4 rounded-lg px-2 py-3 transition hover:bg-muted"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
                    <Users className="h-6 w-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-foreground">Ẩn tin với</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-border bg-background px-4 py-4">
              <button
                onClick={() => setIsPrivacyModalOpen(false)}
                className="px-6 py-2 text-sm font-bold text-emerald-600 transition hover:bg-emerald-50 rounded-md"
              >
                Hủy
              </button>
              <button
                onClick={() => setIsPrivacyModalOpen(false)}
                className="rounded-md bg-emerald-600 px-8 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 shadow-md"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 🔥 DISCARD CONFIRMATION MODAL */}
      {isDiscardModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-card/70 backdrop-blur-sm">
          <div className="w-full max-w-[450px] overflow-hidden rounded-xl bg-card shadow-2xl border border-border animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="relative border-b border-border px-4 py-4 text-center">
              <h2 className="text-xl font-bold text-foreground">Bỏ tin?</h2>
              <button 
                onClick={() => setIsDiscardModalOpen(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-background text-muted-foreground transition hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <p className="text-base text-foreground font-medium">
                Bạn có chắc chắn muốn bỏ tin này không? Hệ thống sẽ không lưu tin của bạn.
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end items-center gap-6 px-4 py-4">
              <button
                onClick={() => setIsDiscardModalOpen(false)}
                className="text-sm font-bold text-emerald-600 transition hover:underline"
              >
                Tiếp tục chỉnh sửa
              </button>
              <button
                onClick={() => {
                  handleRemoveSelectedImage();
                  navigate(-1);
                }}
                className="rounded-lg bg-emerald-600 px-10 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 shadow-md"
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
