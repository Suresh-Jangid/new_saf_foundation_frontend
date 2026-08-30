# Razorpay Payment Gateway Integration

This document explains how to set up and use the Razorpay payment gateway integration in the Purabiya Foundation Admin application.

## Setup Instructions

### 1. Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id_here
```

### 2. Getting Razorpay Credentials

1. Sign up for a Razorpay account at [https://razorpay.com](https://razorpay.com)
2. Go to your Razorpay Dashboard
3. Navigate to Settings > API Keys
4. Generate API Keys (Test mode for development, Live mode for production)
5. Copy the Key ID and Key Secret

### 3. Features

The integration includes:

- **Payment Button**: A secure payment button that opens Razorpay checkout
- **Order Creation**: Server-side order creation for security
- **Payment Verification**: Server-side payment verification using webhooks
- **Payment Status**: Real-time payment status updates
- **Error Handling**: Comprehensive error handling and user feedback

### 4. Usage

The payment button appears automatically when:
- A fee is calculated based on gender and age
- The applicant name is filled
- Payment status is not already 'paid'

### 5. Payment Flow

1. User clicks "Pay ₹{amount} Now" button
2. Razorpay checkout modal opens
3. User completes payment
4. Payment is verified on the server
5. Payment status is updated in the form
6. Form can be submitted with payment details

### 6. Security Features

- Server-side order creation
- Payment signature verification
- Secure API key handling
- No sensitive data exposed to client

### 7. API Endpoints

- `POST /api/razorpay/create-order` - Creates a new payment order
- `POST /api/razorpay/verify-payment` - Verifies payment signature

### 8. Testing

For testing, use Razorpay's test mode with test card numbers:
- Success: 4111 1111 1111 1111
- Failure: 4000 0000 0000 0002

### 9. Production Deployment

1. Switch to Live mode in Razorpay dashboard
2. Update environment variables with live credentials
3. Ensure HTTPS is enabled
4. Test with real payment methods

## Troubleshooting

### Common Issues

1. **Script Loading Error**: Ensure Razorpay script is accessible
2. **Payment Verification Failed**: Check webhook configuration
3. **Environment Variables**: Verify all required variables are set
4. **CORS Issues**: Ensure proper CORS configuration

### Support

For Razorpay-specific issues, refer to:
- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay Support](https://razorpay.com/support/)
