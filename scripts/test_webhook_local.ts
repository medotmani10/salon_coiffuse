
import http from 'http';

const data = JSON.stringify({
    messages: [
        {
            chat_id: '123456789@s.whatsapp.net',
            text: { body: 'Ping Local Server' },
            from_me: false
        }
    ]
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/webhook',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);

    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('Response:', body);
        if (res.statusCode === 200) {
            console.log("✅ Local Webhook is responding!");
        } else {
            console.log("❌ Webhook returned error.");
        }
    });
});

req.on('error', (error) => {
    console.error("❌ Connection Failed:", error.message);
});

req.write(data);
req.end();
