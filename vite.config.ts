import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@privy-io/react-auth'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://api-pay.agent.tech',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
