"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface DebugInfo {
  environment: {
    phoneNumberId: string;
    accessToken: string;
    businessAccountId: string;
  };
  apiUrl: string;
  timestamp: string;
  testApiCall?: any;
}

export default function WhatsAppDebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('918094983470');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const fetchDebugInfo = async () => {
    try {
      const response = await fetch('/api/whatsapp-debug');
      const data = await response.json();
      setDebugInfo(data);
    } catch (error) {
      console.error('Error fetching debug info:', error);
      toast.error('Failed to fetch debug info');
    }
  };

  const runTest = async (testType: 'simple' | 'template') => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/whatsapp-debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, testType }),
      });

      const data = await response.json();
      setTestResult(data);

      if (data.success) {
        toast.success('Test message sent successfully!');
      } else {
        toast.error(`Test failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error running test:', error);
      toast.error('Failed to run test');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">WhatsApp API Debug</h1>
        <p className="text-gray-600">Debug and test WhatsApp Business API integration</p>
      </div>

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Configuration</CardTitle>
          <CardDescription>Current WhatsApp API configuration</CardDescription>
        </CardHeader>
        <CardContent>
          {debugInfo ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Phone Number ID:</span>
                <Badge variant={debugInfo.environment.phoneNumberId === 'NOT SET' ? 'destructive' : 'default'}>
                  {debugInfo.environment.phoneNumberId}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Access Token:</span>
                <Badge variant={debugInfo.environment.accessToken === 'NOT SET' ? 'destructive' : 'default'}>
                  {debugInfo.environment.accessToken}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Business Account ID:</span>
                <Badge variant={debugInfo.environment.businessAccountId === 'NOT SET' ? 'destructive' : 'default'}>
                  {debugInfo.environment.businessAccountId}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">API URL:</span>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {debugInfo.apiUrl}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Last Updated:</span>
                <span className="text-sm text-gray-600">
                  {new Date(debugInfo.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <p>Loading debug information...</p>
          )}
          <Button onClick={fetchDebugInfo} className="mt-4" variant="outline">
            Refresh Debug Info
          </Button>
        </CardContent>
      </Card>

      {/* API Test */}
      <Card>
        <CardHeader>
          <CardTitle>API Test</CardTitle>
          <CardDescription>Test WhatsApp API with different message types</CardDescription>
        </CardHeader>
        <CardContent>
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

            <div className="flex gap-2">
              <Button
                onClick={() => runTest('simple')}
                disabled={isLoading}
                variant="outline"
              >
                Test Simple Message
              </Button>
              <Button
                onClick={() => runTest('template')}
                disabled={isLoading}
                variant="outline"
              >
                Test Template Message
              </Button>
            </div>

            {testResult && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Test Result:</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Status:</span>
                    <Badge variant={testResult.success ? 'default' : 'destructive'} className="ml-2">
                      {testResult.status} {testResult.statusText}
                    </Badge>
                  </div>
                  {testResult.error && (
                    <div>
                      <span className="font-medium">Error:</span>
                      <pre className="mt-1 p-2 bg-red-50 text-red-700 rounded text-xs overflow-auto">
                        {testResult.error}
                      </pre>
                    </div>
                  )}
                  {testResult.data && (
                    <div>
                      <span className="font-medium">Response:</span>
                      <pre className="mt-1 p-2 bg-green-50 text-green-700 rounded text-xs overflow-auto">
                        {JSON.stringify(testResult.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting 401 Error</CardTitle>
          <CardDescription>Common causes and solutions for authentication errors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-medium text-red-600">1. Invalid Access Token</h4>
              <p>• Check if the access token is correct and not expired</p>
              <p>• Verify the token has the required permissions (whatsapp_business_messaging)</p>
            </div>
            <div>
              <h4 className="font-medium text-red-600">2. Wrong Phone Number ID</h4>
              <p>• Ensure the Phone Number ID matches your WhatsApp Business account</p>
              <p>• Verify the number is properly configured in Meta Business Manager</p>
            </div>
            <div>
              <h4 className="font-medium text-red-600">3. Environment Variables</h4>
              <p>• Make sure .env.local file exists in the project root</p>
              <p>• Restart the development server after adding environment variables</p>
            </div>
            <div>
              <h4 className="font-medium text-red-600">4. API Version</h4>
              <p>• Current implementation uses v22.0 - ensure this version is supported</p>
              <p>• Check Meta's API documentation for version compatibility</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
