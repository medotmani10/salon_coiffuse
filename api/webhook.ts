
import { aiService } from '../src/services/ai';
import { whapiService } from '../src/services/whapi';

// Vercel Serverless Function Handler
export default async function handler(req: any, res: any) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'GET') {
        res.status(200).json({ status: 'active', service: 'Whapi Webhook' });
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    try {
        const body = req.body;
        console.log("Whapi Webhook Payload:", JSON.stringify(body, null, 2));

        // Whapi Payload Structure: { messages: [...] }
        const messages = body.messages;

        // Validation: If no messages, it might be a status update or other event type
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            // Just acknowledge
            res.status(200).json({ status: 'ignored' });
            return;
        }

        for (const msg of messages) {
            // Ignore if from me
            if (msg.from_me) continue;

            // Whapi provides chat_id (e.g., 213555...@s.whatsapp.net) and text body
            const remoteJid = msg.chat_id;
            const text = msg.text?.body;

            // Skipping non-text messages for now
            if (!remoteJid || !text) continue;

            console.log(`Received WhatsApp from ${remoteJid}: ${text}`);

            // 1. Context Loading
            const minimalContext = {
                source: "WhatsApp",
                sender: remoteJid
            };

            // 2. Get AI Response
            const aiResponse = await aiService.chat(text, minimalContext);

            // 3. Send Reply via Whapi
            await whapiService.sendText(remoteJid, aiResponse);
        }

        res.status(200).json({ status: 'success' });

    } catch (error: any) {
        console.error("Webhook Error:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
}
