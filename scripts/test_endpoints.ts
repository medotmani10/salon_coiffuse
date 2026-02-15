
import 'dotenv/config';

const APPSLINK_API_KEY = process.env.APPSLINK_API_KEY;
const APPSLINK_INSTANCE_KEY = process.env.APPSLINK_INSTANCE_KEY;
let BASE_URL = process.env.APPSLINK_URL || 'https://app.appslink.io/api';

async function testEndpoint(path: string, method: string = 'POST') {
    const url = `${BASE_URL}${path}`;
    console.log(`Testing ${method} ${url}...`);
    try {
        const body = method === 'POST' ? JSON.stringify({
            appkey: APPSLINK_INSTANCE_KEY,
            to: '213555123456',
            message: 'test'
        }) : undefined;

        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${APPSLINK_API_KEY}`
            },
            body
        });

        console.log(`Status: ${res.status} ${res.statusText}`);
        if (res.status !== 404 && res.status !== 405) {
            const text = await res.text();
            console.log("Response:", text.substring(0, 200));
        }
    } catch (e: any) {
        console.log("Error:", e.message);
    }
    console.log("---");
}

async function run() {
    // Test original (app.appslink.io)
    console.log("--- Testing app.appslink.io ---");
    BASE_URL = 'https://app.appslink.io/api';
    await testEndpoint('/status', 'GET');

    // Test api.appslink.io
    console.log("\n--- Testing api.appslink.io ---");
    BASE_URL = 'https://api.appslink.io/api';
    await testEndpoint('/status', 'GET');
    await testEndpoint('/instance/status', 'GET');

    // Test just api.appslink.io without /api
    console.log("\n--- Testing api.appslink.io (no /api) ---");
    BASE_URL = 'https://api.appslink.io';
    await testEndpoint('/status', 'GET');
}



run();
