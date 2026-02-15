// Using native fetch (Node.js 18+)

async function testConversationFlow() {
    console.log("🧪 Testing conversation flow...\n");

    // Test 1: First message (should have greeting)
    console.log("=== Test 1: First Message ===");
    const firstMessage = {
        messages: [{
            from_me: false,
            chat_id: "213999888777@s.whatsapp.net",
            text: { body: "مرحبا" }
        }]
    };

    try {
        const res1 = await fetch('http://localhost:3000/api/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(firstMessage)
        });
        console.log("✅ First message sent\n");

        // Wait a bit for processing
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Test 2: Second message (should NOT have greeting)
        console.log("=== Test 2: Second Message ===");
        const secondMessage = {
            messages: [{
                from_me: false,
                chat_id: "213999888777@s.whatsapp.net",
                text: { body: "نحب نحجز موعد" }
            }]
        };

        const res2 = await fetch('http://localhost:3000/api/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(secondMessage)
        });
        console.log("✅ Second message sent\n");

        console.log("📝 Check the webhook server logs to see:");
        console.log("   - First message: Should start with 'السلام عليكم لالة'");
        console.log("   - Second message: Should NOT have greeting, just direct response");

    } catch (error: any) {
        console.error("❌ Error:", error.message);
    }
}

testConversationFlow();
