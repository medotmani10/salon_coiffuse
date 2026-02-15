
import 'dotenv/config';
import { whapiService } from '../src/services/whapi';

async function testWhapi() {
    console.log("Testing Whapi Integration...");
    console.log("--------------------------------");

    if (!process.env.WHAPI_TOKEN || !process.env.WHAPI_URL) {
        console.error("❌ ERROR: Missing WHAPI_TOKEN or WHAPI_URL in .env");
        return;
    }

    // Default test number or from args
    const targetPhone = process.argv[2] || '213555123456';

    console.log(`Sending test message to: ${targetPhone}`);

    try {
        const result = await whapiService.sendText(targetPhone, "Salam! Hada test message men Salon App via Whapi 🚀");
        console.log("API Response:", JSON.stringify(result, null, 2));

        if (result && !result.error) {
            console.log("✅ Message sent (or queued) successfully!");
        } else {
            console.log("⚠️ Message failed.");
        }

    } catch (error) {
        console.error("❌ Fatal Error:", error);
    }
}

testWhapi();
