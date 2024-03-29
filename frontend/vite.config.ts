import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(
{
    plugins: [vue()],
    resolve: 
    {
        alias: 
        {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    server:
	{
		proxy:
		{
			'/api': 
			{
				target: 'https://192.168.8.130:8081',
				changeOrigin: true,
				secure: false
			},
			'/socket.io': {
				target: 'https://192.168.8.130:8081',
				changeOrigin: true,
				ws: true,
				secure: false
			},
            "/*": {
				target: 'https://192.168.8.130:8081'
			},
		}
	},
    build:
    {
        outDir: "../dist"
    }
})
