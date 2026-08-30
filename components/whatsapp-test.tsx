"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export function WhatsAppTest() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [templateName, setTemplateName] = useState('hello_world');
  const [isLoading, setIsLoading] = useState(false);

  const sendTestMessage = async (type: 'text' | 'template' | 'confirmation') => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }

    setIsLoading(true);
    try {
      const body: any = { phoneNumber };
      
      if (type === 'text' && message) {
        body.message = message;
      } else if (type === 'template') {
        body.templateName = templateName;
      }

      const response = await fetch('/api/whatsapp-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('WhatsApp message sent successfully!');
        console.log('Response:', data);
      } else {
        toast.error(data.error || 'Failed to send message');
        console.error('Error:', data);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to send WhatsApp message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">WhatsApp Test</h2>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="918094983470"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="message">Custom Message</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your custom message here..."
            className="mt-1"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="template">Template Name</Label>
          <Input
            id="template"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="hello_world"
            className="mt-1"
          />
        </div>

        <div className="space-y-2">
          <Button
            onClick={() => sendTestMessage('text')}
            disabled={isLoading || !message}
            className="w-full"
          >
            Send Custom Message
          </Button>
          
          <Button
            onClick={() => sendTestMessage('template')}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            Send Template Message
          </Button>
          
          <Button
            onClick={() => sendTestMessage('confirmation')}
            disabled={isLoading}
            variant="secondary"
            className="w-full"
          >
            Send Application Confirmation
          </Button>
        </div>
      </div>
    </div>
  );
}
