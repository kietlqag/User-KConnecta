/** Security headers — dùng chung cho Vite dev/preview. Production: xem vercel.json */
const CSP_DEV =
  "default-src 'self'; " +
  "script-src 'self' https://accounts.google.com; " +
  "style-src 'self' 'unsafe-inline'; " +
  "font-src 'self' data:; " +
  "img-src 'self' data: blob: https://res.cloudinary.com https://cdn.jsdelivr.net https://i.pravatar.cc https://ui-avatars.com https://images.unsplash.com https://placehold.co; " +
  "media-src 'self' blob: https://res.cloudinary.com; " +
  "connect-src 'self' http://localhost:8080 ws://localhost:3000 ws://localhost:8080 https://res.cloudinary.com https://accounts.google.com https://oauth2.googleapis.com wss: ws:; " +
  "frame-src https://accounts.google.com; " +
  "frame-ancestors 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self'; " +
  "object-src 'none'";

/** Dev dùng Report-Only để không chặn tài nguyên khi đang debug */
export const devSecurityHeaders: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-site',
  'Permissions-Policy':
    'accelerometer=(), camera=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(self), payment=(), usb=()',
  'Content-Security-Policy-Report-Only': CSP_DEV,
};

/** Preview build — CSP chặn thật, giống production (trừ HSTS vì thường chạy HTTP local) */
export const previewSecurityHeaders: Record<string, string> = {
  ...devSecurityHeaders,
  'Content-Security-Policy': CSP_DEV,
};
delete previewSecurityHeaders['Content-Security-Policy-Report-Only'];
