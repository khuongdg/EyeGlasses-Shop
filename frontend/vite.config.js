import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'antd',
      '@ant-design/icons',
      '@ant-design/plots',
      'axios',
      'dayjs',
      'lodash',
      '@tanstack/react-query'
    ]
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@ant-design/plots') || id.includes('@antv')) {
              return 'vendor-charts';
            }
            if (id.includes('exceljs') || id.includes('xlsx')) {
              return 'vendor-excel';
            }
            if (id.includes('antd') || id.includes('@ant-design/icons')) {
              return 'vendor-antd';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('@tanstack')) {
              return 'vendor-react-core';
            }
            return 'vendor-libs';
          }
        }
      }
    }
  }
})
