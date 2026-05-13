const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;

export async function compressImage(file: File): Promise<File> {
  if (file.type.startsWith('video/')) return file;
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Skip compression for small images (< 500KB)
      if (file.size < 500 * 1024 && width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
        resolve(file);
        return;
      }

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          // Keep original if compressed is bigger (rare but possible for already-compressed jpegs)
          if (blob.size >= file.size) { resolve(file); return; }
          resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
        },
        'image/jpeg',
        JPEG_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
