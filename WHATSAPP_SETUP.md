# WhatsApp Business API Setup

This document explains how to set up WhatsApp messaging functionality for the Purabiya Foundation Admin application.

## Environment Variables

Create a `.env.local` file in the root directory and add the following variables:

```env
# WhatsApp Business API Configuration
WHATSAPP_PHONE_NUMBER_ID=762623680277400
WHATSAPP_BUSINESS_ACCOUNT_ID=1505803573785036
WHATSAPP_ACCESS_TOKEN=EAARiBiNOQyEBP4VlK6bfZBh86gW6u81nuCQ3Cyk8Yy3dXERzGJZBEXiMvKrm9nZBfZBDagajV1NIywuzFmz274TotYSInBKQ12dWHfEZCUTCZCe2tLH0DijAE4mhx4Q0wfe1m01VPbZBYrWCcEh172pbjt5qQNsm6QV3HU9ErbIPZCagz9XkWCS4T5jZAWZCH2d4IPuMKgOxyQEOIj7ZBu6L3A7wYgjhHHPKJtwwCrbDov3XQZDZD
```

## Features

### Automatic WhatsApp Messages
- When a general application form is successfully submitted, an automatic WhatsApp message is sent to the applicant
- The message includes:
  - Welcome message from Purabiya Foundation
  - Applicant's name
  - Application number (if available)
  - Confirmation of successful submission

### Message Format
```
🎉 *Welcome to Purabiya Foundation!*

Dear [Applicant Name],

Your application has been successfully submitted! 

Application Number: [Application Number]

We will review your application and get back to you soon. Thank you for choosing Purabiya Foundation.

Best regards,
Purabiya Foundation Team
```

## API Endpoints

The WhatsApp service uses the Facebook Graph API v22.0:

- **Base URL**: `https://graph.facebook.com/v22.0/{phone_number_id}/messages`
- **Method**: POST
- **Authentication**: Bearer token

## Phone Number Validation

The service automatically validates and formats Indian mobile numbers:
- 10-digit numbers starting with 6, 7, 8, or 9 are prefixed with country code 91
- Numbers already with country code 91 are used as-is
- Invalid numbers are rejected with a warning

## Error Handling

- WhatsApp message failures don't affect form submission success
- Errors are logged to console for debugging
- Users are not shown WhatsApp-related errors to maintain smooth UX

## Testing

To test the WhatsApp functionality:

1. Ensure environment variables are set correctly
2. Submit a general application form with a valid Indian mobile number
3. Check the browser console for success/error messages
4. Verify the WhatsApp message is received on the provided number

## Troubleshooting

### Common Issues

1. **Invalid Phone Number Format**
   - Ensure the mobile number is a valid 10-digit Indian number
   - Check that the number starts with 6, 7, 8, or 9

2. **API Authentication Errors**
   - Verify the access token is correct and not expired
   - Check that the phone number ID matches your WhatsApp Business account

3. **Message Not Received**
   - Ensure the recipient has WhatsApp installed
   - Check if the number is registered with WhatsApp
   - Verify the message template is approved (for template messages)

### Debug Mode

Enable debug logging by checking the browser console for:
- "WhatsApp message sent successfully"
- "Invalid phone number format for WhatsApp"
- "Failed to send WhatsApp message"

## Security Notes

- Keep your access token secure and never commit it to version control
- Use environment variables for all sensitive configuration
- Regularly rotate your access tokens for security
