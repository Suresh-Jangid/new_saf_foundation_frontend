import { NextRequest, NextResponse } from 'next/server';
import { whatsappService, WhatsAppService } from '@/lib/whatsapp-service';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, message, templateName } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Validate phone number
    const validatedPhone = WhatsAppService.validatePhoneNumber(phoneNumber);
    if (!validatedPhone) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    let response;
    
    if (templateName) {
      // Send template message
      response = await whatsappService.sendTemplateMessage(validatedPhone, templateName);
    } else if (message) {
      // Send custom text message
      response = await whatsappService.sendTextMessage(validatedPhone, message);
    } else {
      // Send default application confirmation
      response = await whatsappService.sendApplicationConfirmation(
        validatedPhone,
        'Test User',
        'TEST-001'
      );
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp message sent successfully',
      response: response
    });

  } catch (error: any) {
    console.error('WhatsApp API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send WhatsApp message',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'WhatsApp Test API',
    usage: {
      POST: {
        description: 'Send a WhatsApp message',
        body: {
          phoneNumber: 'string (required)',
          message: 'string (optional)',
          templateName: 'string (optional)'
        },
        examples: [
          {
            description: 'Send custom message',
            body: { phoneNumber: '918094983470', message: 'Hello from Purabiya Foundation!' }
          },
          {
            description: 'Send template message',
            body: { phoneNumber: '918094983470', templateName: 'hello_world' }
          },
          {
            description: 'Send application confirmation',
            body: { phoneNumber: '918094983470' }
          }
        ]
      }
    }
  });
}
