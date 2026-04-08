import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE_URL = (process.env.API_BASE_URL as string | undefined) ?? 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token-Interceptor: fügt Bearer-Token aus authStore zu jedem Request hinzu
apiClient.interceptors.request.use((reqConfig) => {
  const token = useAuthStore.getState().token;
  if (token) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }
  return reqConfig;
});
