import axios from 'axios';

const BASE_URL = (process.env.API_BASE_URL as string | undefined) ?? 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token-Injection: in Plan 03 wird ein Interceptor hinzugefügt
// apiClient.interceptors.request.use(...)
