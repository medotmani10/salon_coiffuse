// Using native fetch (Node.js 18+)

async function testWebhook() {
    const testPayload = {
        messages: [
            {
                from_me: false,
                chat_id: "213555123456@s.whatsapp.net",
                text: {
                    body: "السلام عليكم"
                }
            }
        ]
    };

    console.log("🧪 Testing local webhook...\n");
    console.log("Payload:", JSON.stringify(testPayload, null, 2));

    try {
        const response = await fetch('http://localhost:3000/api/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testPayload)
        });

        console.log("\n✅ Response Status:", response.status);
        const data = await response.json();
        console.log("Response Body:", JSON.stringify(data, null, 2));

    } catch (error: any) {
        console.error("\n❌ Error:", error.message);
    }
}

testWebhook();
