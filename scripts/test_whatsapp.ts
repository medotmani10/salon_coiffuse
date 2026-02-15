
import 'dotenv/config';
import { appsLinkService } from '../src/services/appslink';

// Test phone number (replace with user's own number if known, or prompt)
// For safety, let's use a dummy or ask user to input it as an arg if possible, 
// but for simplicity in this environment, I'll log instructions.

async function testWhatsApp() {
    console.log("Testing AppsLink Integration...");
    console.log("--------------------------------");

    if (!process.env.APPSLINK_API_KEY || !process.env.APPSLINK_INSTANCE_KEY) {
        console.error("❌ ERROR: Missing APPSLINK_API_KEY or APPSLINK_INSTANCE_KEY in .env");
        return;
    }

    const targetPhone = process.argv[2];
    if (!targetPhone) {
        console.log("usage: npx tsx scripts/test_whatsapp.ts <PHONE_NUMBER>");
        console.log("Example: npx tsx scripts/test_whatsapp.ts 213555123456");
        return;
    }

    console.log(`Sending test message to: ${targetPhone}`);

    try {
        const result = await appsLinkService.sendText(targetPhone, "Salam! Hada test message men Salon App 🤖✨");
        console.log("API Response:", result);

        if (result && result.status === "success") {
            console.log("✅ Message sent successfully!");
        } else {
            console.log("⚠️ Message status unknown. Check phone.");
        }

    } catch (error) {
        console.error("❌ Fatal Error:", error);
    }
}

testWhatsApp();
