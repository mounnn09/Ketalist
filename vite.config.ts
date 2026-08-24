import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    {
      name: 'youtube-transcript-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.startsWith('/api/transcript')) {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const videoId = url.searchParams.get('videoId');
            if (videoId) {
              try {
                const fetchRes = await fetch(`https://youtube-transcript.ai/transcript/${videoId}.txt`);
                if (!fetchRes.ok) throw new Error(`Failed to fetch transcript (Status: ${fetchRes.status})`);
                const transcript = await fetchRes.text();
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ transcript: transcript }));
                return;
              } catch (e: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message }));
                return;
              }
            }
          }
          next();
        });
      }
    }
  ],
})
