
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';
  import tailwindcss from '@tailwindcss/vite';
  import path from 'path';

  export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        'figma:asset/c7a8ce7ba396d53b08d61568bbcaba1bfb78fb98.png': path.resolve(__dirname, './src/assets/c7a8ce7ba396d53b08d61568bbcaba1bfb78fb98.png'),
        'figma:asset/74ca37b8e92fb5ac2cb3fb9e7b8898e6ebafb02b.png': path.resolve(__dirname, './src/assets/74ca37b8e92fb5ac2cb3fb9e7b8898e6ebafb02b.png'),
        'figma:asset/5b4cb3f200da18be30ba3014c937ebcb48fc745c.png': path.resolve(__dirname, './src/assets/5b4cb3f200da18be30ba3014c937ebcb48fc745c.png'),
        'figma:asset/58e376210e8b57f0e10b46b5669deeb5e25d1922.png': path.resolve(__dirname, './src/assets/58e376210e8b57f0e10b46b5669deeb5e25d1922.png'),
        'figma:asset/34ededad5ccd5d51ad30647ea2c59d1a7ff31f90.png': path.resolve(__dirname, './src/assets/34ededad5ccd5d51ad30647ea2c59d1a7ff31f90.png'),
        'figma:asset/31a71acf4ef3fd228bada3a6b0e3bebe7634528f.png': path.resolve(__dirname, './src/assets/31a71acf4ef3fd228bada3a6b0e3bebe7634528f.png'),
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
    },
    server: {
      port: process.env.PORT ? Number(process.env.PORT) : 3000,
      open: '/',
      // CSP ở chế độ Report-Only: KHÔNG chặn gì, chỉ ghi vi phạm vào Console (tab DevTools).
      // Mục đích: quan sát những gì SẼ bị chặn để tinh chỉnh policy, rồi mới bật chặn thật.
      headers: {
        'Content-Security-Policy-Report-Only':
          "default-src 'self'; " +
          "script-src 'self'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com; " +
          // res.cloudinary.com = ảnh thật; còn lại là ảnh SEED/placeholder (chỉ dùng cho demo)
          "img-src 'self' data: blob: https://res.cloudinary.com https://placehold.co https://images.unsplash.com https://i.pravatar.cc https://ui-avatars.com; " +
          "media-src 'self' blob: https://res.cloudinary.com; " +   // LiveKit stream tạo blob: URL
          "connect-src 'self' https://res.cloudinary.com https://accounts.google.com wss: ws:; " +
          "frame-src https://accounts.google.com; " +
          "frame-ancestors 'none'; " +
          "base-uri 'self'",
      },
      hmr: {
        host: 'localhost',
        protocol: 'ws',
      },
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '/ws': {
          target: 'http://localhost:8080',
          ws: true,
          changeOrigin: true,
        },
      },
    },
  });