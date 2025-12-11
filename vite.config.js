import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [basicSsl()],
  server: {
    host: true,  // 暴露到局域网
    https: true  // 启用 HTTPS
  }
});
