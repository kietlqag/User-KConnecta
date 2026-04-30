import { useRef, useEffect, useState } from 'react';

export function useChatScroll(
  messagesLength: number,
  loading: boolean,
  userId: string,
  onLoadOlder?: () => Promise<void> | void,
  hasOlder?: boolean,
  loadingOlder?: boolean
) {
  const messageListRef = useRef<HTMLDivElement>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const rafRef = useRef<number | null>(null);
  const settleTimersRef = useRef<number[]>([]);
  
  const initializedRef = useRef(false);
  const shouldStickToBottomRef = useRef(true);
  const prependScrollAdjustRef = useRef<{ scrollTop: number; scrollHeight: number } | null>(null);
  const previousMessageCountRef = useRef(0);
  const loadingOlderRef = useRef(false);

  const clearPendingScrollJobs = () => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (settleTimersRef.current.length > 0) {
      settleTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      settleTimersRef.current = [];
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const list = messageListRef.current;
    if (!list) return;
    clearPendingScrollJobs();

    list.scrollTo({ top: list.scrollHeight, behavior: 'auto' });
    setShowJumpToLatest(false);

    rafRef.current = window.requestAnimationFrame(() => {
      const currentList = messageListRef.current;
      if (!currentList) return;
      currentList.scrollTo({ top: currentList.scrollHeight, behavior });
      setShowJumpToLatest(false);
      rafRef.current = null;
    });

    // Media (image/voice/file preview) may change height shortly after render.
    settleTimersRef.current.push(
      window.setTimeout(() => {
        const currentList = messageListRef.current;
        if (!currentList) return;
        currentList.scrollTo({ top: currentList.scrollHeight, behavior: 'auto' });
        setShowJumpToLatest(false);
      }, 120),
    );
    settleTimersRef.current.push(
      window.setTimeout(() => {
        const currentList = messageListRef.current;
        if (!currentList) return;
        currentList.scrollTo({ top: currentList.scrollHeight, behavior: 'auto' });
        setShowJumpToLatest(false);
      }, 280),
    );
  };

  useEffect(() => {
    initializedRef.current = false;
    previousMessageCountRef.current = 0;
    shouldStickToBottomRef.current = true;
    prependScrollAdjustRef.current = null;
    loadingOlderRef.current = false;
    clearPendingScrollJobs();
  }, [userId]);

  useEffect(() => {
    return () => {
      clearPendingScrollJobs();
    };
  }, []);

  useEffect(() => {
    if (loading || initializedRef.current || messagesLength === 0) return;
    scrollToBottom('auto');
    initializedRef.current = true;
    previousMessageCountRef.current = messagesLength;
  }, [loading, messagesLength]);

  useEffect(() => {
    const list = messageListRef.current;
    if (!list) return;

    if (prependScrollAdjustRef.current) {
      const { scrollTop, scrollHeight } = prependScrollAdjustRef.current;
      const delta = list.scrollHeight - scrollHeight;
      list.scrollTop = scrollTop + delta;
      prependScrollAdjustRef.current = null;
      previousMessageCountRef.current = messagesLength;
      return;
    }

    const appended = messagesLength > previousMessageCountRef.current;
    if (appended && shouldStickToBottomRef.current) {
      scrollToBottom('smooth');
    }
    previousMessageCountRef.current = messagesLength;
  }, [messagesLength]);

  const handleListScroll = () => {
    const list = messageListRef.current;
    if (!list) return;

    const distanceToBottom = list.scrollHeight - (list.scrollTop + list.clientHeight);
    shouldStickToBottomRef.current = distanceToBottom < 120;
    setShowJumpToLatest(distanceToBottom > 320);

    if (!onLoadOlder || !hasOlder || loadingOlder || loadingOlderRef.current || list.scrollTop > 200) {
      return;
    }

    loadingOlderRef.current = true;
    prependScrollAdjustRef.current = { scrollTop: list.scrollTop, scrollHeight: list.scrollHeight };
    Promise.resolve(onLoadOlder()).finally(() => {
      loadingOlderRef.current = false;
    });
  };

  return {
    messageListRef,
    showJumpToLatest,
    scrollToBottom,
    handleListScroll,
  };
}
