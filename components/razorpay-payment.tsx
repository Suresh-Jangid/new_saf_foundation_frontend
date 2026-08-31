"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ConfigService from '@/lib/config-service';

interface RazorpayPaymentProps {
  amount: number;
  currency?: string;
  description?: string;
  onSuccess: (paymentData: any) => void;
  onError: (error: any) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const RazorpayPayment: React.FC<RazorpayPaymentProps> = ({
  amount,
  currency = 'INR',
  description = 'Payment',
  onSuccess,
  onError,
  disabled = false,
  className = '',
  children,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay script');
      }

      // Create order
      const orderResponse = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency,
          receipt: `receipt_${Date.now()}`,
          notes: {
            description,
          },
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      // Razorpay options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: ConfigService.getAppConfigSync().appName || 'SAF Foundation',
        description: description,
        order_id: orderData.order.id,
        handler: async (response: any) => {
          try {
            // Verify payment
            const verifyResponse = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              toast.success('Payment successful!');
              onSuccess({
                payment_id: response.razorpay_payment_id,
                order_id: response.razorpay_order_id,
                amount: amount,
                currency: currency,
              });
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed');
            onError(error);
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: '',
        },
        notes: {
          description: description,
        },
        theme: {
          color: '#3B82F6',
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
          },
        },
      };

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
      onError(error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || isLoading}
      className={className}
    >
      {isLoading ? 'Processing...' : children || `Pay ₹${amount}`}
    </Button>
  );
};
