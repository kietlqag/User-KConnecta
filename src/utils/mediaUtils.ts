export function isVideoUrl(url?: string | null): boolean {
  if (!url?.trim()) return false;
  const u = url.trim();
  return (
    u.includes('/video/') ||
    u.includes('resource_type=video') ||
    /\.(mp4|mov|webm|m4v|ogg)(\?.*)?$/i.test(u)
  );
}
