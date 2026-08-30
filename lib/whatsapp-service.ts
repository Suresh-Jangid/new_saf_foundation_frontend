interface WhatsAppMessage {
  messaging_product: string;
  to: string;
  type: string;
  template?: {
    name: string;
    language: {
      code: string;
    };
  };
  text?: {
    body: string;
  };
}

interface WhatsAppResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

export class WhatsAppService {
  private phoneNumberId: string;
  private accessToken: string;
  private baseUrl: string;

  constructor() {
    this.phoneNumberId =  '903596396163812';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || 'EAARiBiNOQyEBP43yxeqAqlvyonCTHULgTDgl5fP6A3Fj6IlYBCDRfZCHUEImIIeYGhF8aCztEs7FR7yWvo3gHIZBrdxQe54GiZCCFPj3cHzZANjY7Fysn3cO8qXZBQmQjzCYSZBg9kddUU3NEczbSuVrOHv3S5d6mW2zD2o6PbNvX3ZC8JWHPuWT7XGEgK7VQZDZD'
    this.baseUrl = `https://graph.facebook.com/v22.0/${this.phoneNumberId}/messages`;
  }

  /**
   * Send a template message (like hello_world)
   */
  async sendTemplateMessage(to: string, templateName: string = 'hello_world', languageCode: string = 'en_US'): Promise<WhatsAppResponse> {
    const message: WhatsAppMessage = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        }
      }
    };

    return this.sendMessage(message);
  }

  /**
   * Send a custom text message
   */
  async sendTextMessage(to: string, text: string): Promise<WhatsAppResponse> {
    const message: WhatsAppMessage = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: {
        body: text
      }
    };

    return this.sendMessage(message);
  }

  /**
   * Send application confirmation message
   */
  async sendApplicationConfirmation(phoneNumber: string, applicantName: string, applicationNumber?: string): Promise<WhatsAppResponse> {
    const message = `🎉 *Welcome to Purabiya Foundation!*

Dear ${applicantName},

Your application has been successfully submitted! 

${applicationNumber ? `Application Number: ${applicationNumber}` : ''}

We will review your application and get back to you soon. Thank you for choosing Purabiya Foundation.

Best regards,
Purabiya Foundation Team`;

    return this.sendTextMessage(phoneNumber, message);
  }

  /**
   * Core method to send message via WhatsApp API
   */
  private async sendMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    try {
      // Debug logging
      console.log('WhatsApp API Debug Info:');
      console.log('URL:', this.baseUrl);
      console.log('Access Token (first 20 chars):', this.accessToken.substring(0, 20) + '...');
      console.log('Message:', JSON.stringify(message, null, 2));

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      console.log('Response Status:', response.status);
      console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.text();
        console.error('WhatsApp API Error Response:', errorData);
        throw new Error(`WhatsApp API Error: ${response.status} - ${errorData}`);
      }

      const data: WhatsAppResponse = await response.json();
      console.log('WhatsApp API Success Response:', data);
      return data;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  /**
   * Validate phone number format for WhatsApp
   */
  static validatePhoneNumber(phoneNumber: string): string | null {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    console.log('Phone number validation:', { original: phoneNumber, digits });
    
    // Check if it's a valid Indian mobile number (10 digits starting with 6,7,8,9)
    if (digits.length === 10 && (digits.startsWith('6') || digits.startsWith('7') || digits.startsWith('8') || digits.startsWith('9'))) {
      const result = `91${digits}`;
      console.log('Valid 10-digit number, adding country code:', result);
      return result;
    }
    
    // If it already has country code (12 digits starting with 91)
    if (digits.length === 12 && digits.startsWith('91')) {
      console.log('Valid 12-digit number with country code:', digits);
      return digits;
    }
    
    console.log('Invalid phone number format');
    return null;
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();
