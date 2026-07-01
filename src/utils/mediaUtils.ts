export function isVideoUrl(url?: string | null): boolean {
  if (!url?.trim()) return false;
  const u = url.trim();
  return (
    u.includes('/video/') ||
    u.includes('resource_type=video') ||
    /\.(mp4|mov|webm|m4v|ogg)(\?.*)?$/i.test(u)
  );
}

export function getVideoThumbnail(url?: string | null): string {
  if (!url?.trim()) return '';
  const u = url.trim();
  if (u.includes('cloudinary.com')) {
    const parts = u.split('?');
    const baseUrl = parts[0];
    const query = parts[1] ? `?${parts[1]}` : '';
    const cleanUrl = baseUrl.replace(/\.(mp4|mov|webm|m4v|ogg)$/i, '.jpg');
    return cleanUrl + query;
  }
  return u;
}
