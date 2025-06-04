const API_BASE_URL = 'http://localhost:5000/api';

const defaultOptions = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  credentials: 'include',
};

export const getPrediction = async (lat, lon) => {
  try {
    console.log('Making prediction request for:', { lat, lon }); // Debug log
    console.log('Request URL:', `${API_BASE_URL}/predict`); // Log the full URL
    console.log('Request options:', {
      ...defaultOptions,
      method: 'POST',
      body: JSON.stringify({ 
        latitude: lat, 
        longitude: lon 
      }),
    }); // Log the full request options

    const response = await fetch(`${API_BASE_URL}/predict`, {
      ...defaultOptions,
    method: 'POST',
      body: JSON.stringify({ 
        latitude: lat, 
        longitude: lon 
      }),
  });

    console.log('Response status:', response.status); // Log response status
    console.log('Response headers:', Object.fromEntries(response.headers.entries())); // Log response headers

  if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Prediction API error response:', errorData); // Debug log
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Received prediction data:', data); // Debug log
    
    if (!data || typeof data.prediction !== 'number') {
      throw new Error('Invalid response format from server');
    }

    return data;
  } catch (error) {
    console.error('Prediction API error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    }); // Log detailed error information
    // Provide more specific error messages
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to the prediction server. Please check if the backend is running.');
  }
    throw new Error(`Failed to get prediction: ${error.message}`);
  }
};

export const checkHealth = async () => {
  try {
    console.log('Checking backend health...'); // Debug log
    console.log('Health check URL:', `${API_BASE_URL}/health`); // Log the health check URL
    console.log('Health check options:', defaultOptions); // Log the health check options

    const response = await fetch(`${API_BASE_URL}/health`, defaultOptions);
    
    console.log('Health check response status:', response.status); // Log health check response status
    console.log('Health check response headers:', Object.fromEntries(response.headers.entries())); // Log health check response headers

    if (!response.ok) {
      console.error('Health check failed:', response.status); // Debug log
      throw new Error(`Backend health check failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Health check response data:', data); // Debug log
    
    if (!data || typeof data.status !== 'string') {
      throw new Error('Invalid health check response format');
    }

    return data;
  } catch (error) {
    console.error('Health check error:', error);
    console.error('Health check error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    }); // Log detailed error information
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to the backend server. Please check if it is running.');
    }
    throw new Error(`Backend health check failed: ${error.message}`);
  }
};