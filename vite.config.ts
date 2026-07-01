
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';
  import tailwindcss from '@tailwindcss/vite';
  import path from 'path';
  import { devSecurityHeaders, previewSecurityHeaders } from './security-headers';
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
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('livekit-client')) return 'livekit';
            if (id.includes('@emoji-mart')) return 'emoji-mart';
            if (id.includes('@tiptap') || id.includes('prosemirror')) return 'editor';
            if (id.includes('@radix-ui')) return 'radix';
            if (id.includes('@tanstack/react-query')) return 'query';
            if (id.includes('react-router')) return 'router';
            if (id.includes('hls.js')) return 'hls';
            return 'vendor';
          },
        },
      },
    },
    server: {
      port: process.env.PORT ? Number(process.env.PORT) : 3000,
      open: '/',
      headers: devSecurityHeaders,
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
    preview: {
      port: process.env.PORT ? Number(process.env.PORT) : 3000,
      headers: previewSecurityHeaders,
    },
  });