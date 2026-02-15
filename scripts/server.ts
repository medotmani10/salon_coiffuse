
import 'dotenv/config';
import http from 'http';
import handler from '../api/webhook';

const PORT = 3000;

const server = http.createServer(async (req, res) => {
    // Basic CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Parse Body
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', async () => {
        try {
            if (body) {
                // @ts-ignore
                req.body = JSON.parse(body);
            }
        } catch (e) {
            console.error("JSON Parse Error", e);
        }

        // Mock Vercel response object
        const mockRes = {
            statusCode: 200,
            setHeader: (k: string, v: string) => res.setHeader(k, v),
            status: (code: number) => {
                res.statusCode = code;
                return mockRes;
            },
            json: (data: any) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
            },
            end: (data: any) => res.end(data)
        };

        console.log(`[${req.method}] ${req.url}`);

        if (req.url === '/api/webhook') {
            await handler(req, mockRes);
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 Webhook Server running at http://localhost:${PORT}/api/webhook`);
    console.log(`👉 Point ngrok here: ngrok http ${PORT}`);
});
