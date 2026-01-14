
const API_BASE_URL = 'http://localhost:5000/api';

export const apiRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  try {
    // Add a timeout to fail fast if backend is down, but give enough time for DB access (5s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    // We throw the error so the calling service can catch it and trigger the fallback.
    throw error;
  }
};

export const apiUploadFile = async <T>(endpoint: string, file: File): Promise<T> => {
    // Uploads might take longer, so we give them a longer timeout (e.g. 10s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error('File upload failed');
        }

        return response.json();
    } catch (error) {
        throw error;
    }
};