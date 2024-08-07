import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path = require('path')

// https://vitejs.dev/config/
export default defineConfig(
{
    plugins: [vue()],
    resolve: 
    {
        alias: 
        {
            '@': path.resolve(__dirname, './src'),
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
