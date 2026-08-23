import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { YoutubeTranscript } from 'youtube-transcript';

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
                const transcript = await YoutubeTranscript.fetchTranscript(videoId);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ transcript: transcript.map(t => t.text).join(" ") }));
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
