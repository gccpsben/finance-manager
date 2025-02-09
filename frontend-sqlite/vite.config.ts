import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path = require('path')
import vueDevTools from 'vite-plugin-vue-devtools';

// https://vitejs.dev/config/
export default defineConfig(
{
	plugins: [ vue() ],
    resolve:
    {
        alias: { '@': path.resolve(__dirname, './src') }
    },
    server:
	{
		proxy:
		{
			'/api':
			{
				target: 'https://localhost:8081',
				changeOrigin: true,
				secure: false
			},
			'/socket.io':
			{
				target: 'https://localhost:8081',
				changeOrigin: true,
				ws: true,
				secure: false
			},
            "/*": { target: 'https://localhost:8081' }
		}
	},
    build: { outDir: "../dist-sqlite" }
})
