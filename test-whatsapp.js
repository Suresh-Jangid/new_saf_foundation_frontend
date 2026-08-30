// WhatsApp API Test Script
// Run with: node test-whatsapp.js

const phoneNumberId = '762623680277400';
const accessToken = 'EAARiBiNOQyEBP4VlK6bfZBh86gW6u81nuCQ3Cyk8Yy3dXERzGJZBEXiMvKrm9nZBfZBDagajV1NIywuzFmz274TotYSInBKQ12dWHfEZCUTCZCe2tLH0DijAE4mhx4Q0wfe1m01VPbZBYrWCcEh172pbjt5qQNsm6QV3HU9ErbIPZCagz9XkWCS4T5jZAWZCH2d4IPuMKgOxyQEOIj7ZBu6L3A7wYgjhHHPKJtwwCrbDov3XQZDZD';
const testPhoneNumber = '918094983470'; // Replace with your test number

const apiUrl = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;

async function testWhatsAppAPI() {
  console.log('Testing WhatsApp API...');
  console.log('Phone Number ID:', phoneNumberId);
  console.log('API URL:', apiUrl);
  console.log('Test Phone Number:', testPhoneNumber);
  console.log('---');

  // Test 1: Template Message
  const templateMessage = {
    messaging_product: 'whatsapp',
    to: testPhoneNumber,
    type: 'template',
    template: {
      name: 'hello_world',
      language: {
        code: 'en_US'
      }
    }
  };

  try {
    console.log('Sending template message...');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templateMessage),
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success! Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Error Response:', errorText);
    }
  } catch (error) {
    console.log('❌ Network Error:', error.message);
  }

  console.log('---');

  // Test 2: Text Message
  const textMessage = {
    messaging_product: 'whatsapp',
    to: testPhoneNumber,
    type: 'text',
    text: {
      body: 'Test message from Purabiya Foundation'
    }
  };

  try {
    console.log('Sending text message...');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(textMessage),
    });

    console.log('Response Status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success! Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Error Response:', errorText);
    }
  } catch (error) {
    console.log('❌ Network Error:', error.message);
  }
}

// Run the test
testWhatsAppAPI();
