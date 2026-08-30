import axios from 'axios';

// Use internal proxy to avoid CORS issues
const API_BASE_URL = '/api/fireconnect';

// Client key and secret are now handled server-side in the proxy route
// to prevent exposure and CORS issues.

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // No auth headers needed here, they are added by the proxy
});

export const sendWhatsAppMessage = async (to: string, message: string) => {
  try {
    // Using URLSearchParams for x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('to', to);
    params.append('message', message);

    const response = await apiClient.post('?apicall=sendWhatsappMessage', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
};

export const sendWhatsAppFile = async (to: string, file: Blob | File, caption?: string) => {
  try {
    const formData = new FormData();
    formData.append('to', to);
    if (caption) {
      formData.append('caption', caption);
    }
    formData.append('file', file);

    const response = await apiClient.post('?apicall=sendWhatsappFile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp file:', error);
    throw error;
  }
};
