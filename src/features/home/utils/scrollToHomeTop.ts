/** Đầu nhanh, gần đầu trang chậm dần (ease-out mạnh). */
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-12 * t));

function getScrollElement(): HTMLElement {
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

function getScrollTop(): number {
  const el = getScrollElement();
  return el.scrollTop || window.scrollY || 0;
}

function setScrollTop(y: number) {
  const el = getScrollElement();
  el.scrollTop = y;
  window.scrollTo(0, y);
}

/** Cuộn mượt lên đầu trang bằng rAF (ổn định hơn native smooth khi React re-render). */
export function scrollToHomeTop(durationMs = 720): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setScrollTop(0);
    return Promise.resolve();
  }

  const startY = getScrollTop();
  if (startY <= 2) {
    setScrollTop(0);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / durationMs, 1);
      const nextY = Math.round(startY * (1 - easeOutExpo(progress)));
      setScrollTop(nextY);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setScrollTop(0);
        resolve();
      }
    };

    requestAnimationFrame(tick);
  });
}
