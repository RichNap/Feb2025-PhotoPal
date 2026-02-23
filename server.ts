
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
    const app = express();
    const PORT = 3000;

    // v6.2.4: Global CORS for Hardware Interop
    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        next();
    });

    // In-memory bridge for Chromecast
    const mediaBridge = new Map<string, { data: Buffer, mimeType: string }>();

    // API to push media to the bridge
    app.post('/api/bridge/:filename', express.raw({ type: '*/*', limit: '50mb' }), (req, res) => {
        const { filename } = req.params;
        const mimeType = req.headers['content-type'] || 'image/jpeg';
        
        console.log(`[Bridge] Received upload: ${filename} (${req.body.length} bytes)`);
        mediaBridge.set(filename, { data: req.body, mimeType });
        
        // Auto-cleanup after 5 minutes to prevent memory leaks
        setTimeout(() => {
            mediaBridge.delete(filename);
            console.log(`[Bridge] Evicted: ${filename}`);
        }, 5 * 60 * 1000);

        res.json({ status: 'OK', path: `/media-bridge/${filename}` });
    });

    // Endpoint for Chromecast to fetch the media
    app.get('/media-bridge/:filename', (req, res) => {
        const { filename } = req.params;
        const item = mediaBridge.get(filename);

        if (item) {
            console.log(`[Bridge] Serving to hardware: ${filename}`);
            res.setHeader('Content-Type', item.mimeType);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'no-cache');
            res.send(item.data);
        } else {
            console.warn(`[Bridge] Hardware requested missing file: ${filename}`);
            res.status(404).send('Not Found');
        }
    });

    // Vite middleware for development
    if (process.env.NODE_ENV !== 'production') {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    } else {
        // Serve static files in production
        app.use(express.static(path.join(__dirname, 'dist')));
        app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        });
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`[Server] PhotoPal Engine running on http://localhost:${PORT}`);
    });
}

startServer();
