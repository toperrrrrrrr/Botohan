require('dotenv').config();
const crypto = require('crypto');
const fetch = require('node-fetch');

const NGROK_URL = 'https://57de-158-62-16-254.ngrok-free.app';

function generateSlackSignature(body, timestamp) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    throw new Error('SLACK_SIGNING_SECRET is not set in .env');
  }

  const baseString = `v0:${timestamp}:${JSON.stringify(body)}`;
  const signature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(baseString)
    .digest('hex');
  
  return signature;
}

async function checkEndpoint(path, method = 'GET') {
    try {
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        let body;
        if (path === '/slack/events' && method === 'POST') {
            const timestamp = Math.floor(Date.now() / 1000);
            body = {
                type: 'url_verification',
                challenge: 'test_challenge'
            };
            
            headers['X-Slack-Request-Timestamp'] = timestamp;
            headers['X-Slack-Signature'] = generateSlackSignature(body, timestamp);
        }

        const response = await fetch(`${NGROK_URL}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.text();
        let displayData = data;
        try {
            displayData = JSON.parse(data);
        } catch (e) {
            // If it's not JSON, use the raw text
        }
        console.log(`✅ ${path} check passed:`, displayData);
        return true;
    } catch (error) {
        console.error(`❌ ${path} check failed:`, error.message);
        return false;
    }
}

async function verifySetup() {
    console.log('🔍 Verifying Botohan setup...\n');

    // Check health endpoint
    const healthCheck = await checkEndpoint('/health');
    
    // Check Slack events endpoint with POST
    const eventsCheck = await checkEndpoint('/slack/events', 'POST');

    console.log('\n📋 Summary:');
    console.log(`Health Check: ${healthCheck ? '✅' : '❌'}`);
    console.log(`Events Endpoint: ${eventsCheck ? '✅' : '❌'}`);
    
    console.log('\n🔧 Next steps:');
    if (!healthCheck) {
        console.log('- Verify the server is running');
        console.log('- Check if the port is correct');
        console.log('- Ensure ngrok is running and the URL is correct');
    }
    if (!eventsCheck) {
        console.log('- Verify Slack app credentials');
        console.log('- Check signing secret in .env');
        console.log('- Ensure endpoints are configured in Slack app settings');
    }
}

verifySetup().catch(console.error); 