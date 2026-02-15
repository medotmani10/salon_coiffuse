
// Support both Vite (import.meta.env) and Node.js (process.env)
const getEnv = (key: string) => {
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
    }
    return undefined;
};

const WHAPI_TOKEN = getEnv('WHAPI_TOKEN') || '';
const WHAPI_URL = getEnv('WHAPI_URL') || 'https://gate.whapi.cloud/messages/text';

export const whapiService = {
    // Send a text message
    async sendText(phone: string, message: string) {
        if (!WHAPI_TOKEN) {
            console.error("Whapi credentials missing");
            return null;
        }

        try {
            const body = JSON.stringify({
                to: phone,
                body: message,
                typing_time: 0
            });

            const response = await fetch(WHAPI_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${WHAPI_TOKEN}`
                },
                body: body
            });

            if (!response.ok) {
                const text = await response.text();
                console.error(`Whapi API Error (${response.status}):`, text);
                return { status: 'error', message: text };
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Whapi Send Error:", error);
            return null;
        }
    }
};
