export function formatAlbumDateTime(createdAt: string) {
  const date = new Date(createdAt);
  const datePart = date.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} lúc ${timePart}`;
}
