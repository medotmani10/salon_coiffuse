
import { whatsappAI } from './_services/ai.js';
import { whapiService } from './_services/whapi.js';

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
        res.status(200).json({ status: 'active', service: 'Whapi Webhook (Optimized AI)' });
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
            const phoneNumber = msg.chat_id;
            const text = msg.text?.body;

            // Skipping non-text messages for now
            if (!phoneNumber || !text) continue;

            console.log(`[WhatsApp] 📱 ${phoneNumber}: ${text}`);

            // Use optimized WhatsApp AI service
            // This includes: client recognition, smart context, and 76% token reduction
            const aiResponse = await whatsappAI.replyToClient(text, phoneNumber);

            console.log(`[WhatsApp] 🤖 Response: ${aiResponse}`);

            // Send Reply via Whapi
            await whapiService.sendText(phoneNumber, aiResponse);
        }

        res.status(200).json({ status: 'success' });

    } catch (error: any) {
        console.error("Webhook Error:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
}
