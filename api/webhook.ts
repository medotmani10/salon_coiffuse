
import { aiService } from '../src/services/ai';
import { appsLinkService } from '../src/services/appslink';

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
        res.status(200).json({ status: 'active', service: 'AppsLink Webhook' });
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    try {
        const body = req.body;
        console.log("AppsLink Webhook Payload:", JSON.stringify(body, null, 2));

        // Extract Message Data
        const messageData = body?.data || body;

        // Check if it's a message event
        if (!messageData || !messageData.key || messageData.key.fromMe) {
            // Ignore own messages or invalid payloads
            res.status(200).json({ status: 'ignored' });
            return;
        }

        const remoteJid = messageData.key.remoteJid;
        if (!remoteJid) {
            res.status(200).json({ status: 'no_sender' });
            return;
        }

        // Extract Text
        let text = "";
        if (messageData.message?.conversation) {
            text = messageData.message.conversation;
        } else if (messageData.message?.extendedTextMessage?.text) {
            text = messageData.message.extendedTextMessage.text;
        }

        if (!text) {
            res.status(200).json({ status: 'no_text' });
            return;
        }

        console.log(`Received WhatsApp from ${remoteJid}: ${text}`);

        // 1. Context Loading
        const minimalContext = {
            source: "WhatsApp",
            sender: remoteJid
        };

        // 2. Get AI Response
        const aiResponse = await aiService.chat(text, minimalContext);

        // 3. Send Reply
        await appsLinkService.sendText(remoteJid, aiResponse);

        res.status(200).json({ status: 'success', reply: aiResponse });

    } catch (error: any) {
        console.error("Webhook Error:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
}
