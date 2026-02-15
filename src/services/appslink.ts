
const APPSLINK_API_KEY = process.env.APPSLINK_API_KEY;
const APPSLINK_INSTANCE_KEY = process.env.APPSLINK_INSTANCE_KEY;
const APPSLINK_URL = process.env.APPSLINK_URL || 'https://app.appslink.io/api';

export const appsLinkService = {
    // Send a text message
    async sendText(phone: string, message: string) {
        if (!APPSLINK_API_KEY || !APPSLINK_INSTANCE_KEY) {
            console.error("AppsLink credentials missing");
            return null;
        }

        try {
            const response = await fetch(`${APPSLINK_URL}/create-message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${APPSLINK_API_KEY}`
                },
                body: JSON.stringify({
                    appkey: APPSLINK_INSTANCE_KEY,
                    to: phone,
                    message: message,
                    file: "" // Optional file url
                })
            });

            if (!response.ok) {
                const text = await response.text();
                console.error(`AppsLink API Error (${response.status}):`, text);
                return { status: 'error', message: text };
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error("AppsLink Send Error:", error);
            return null;
        }
    }
};
