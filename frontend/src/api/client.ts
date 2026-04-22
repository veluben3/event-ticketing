import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

let accessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export const setAccessToken = (t: string | null) => {
  accessToken = t;
};
export const getAccessToken = () => accessToken;

export const api: AxiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15_000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

async function refreshAccess(): Promise<string | null> {
  try {
    const { data } = await axios.post(
      '/api/auth/refresh',
      {},
      { withCredentials: true },
    );
    accessToken = data.accessToken;
    return accessToken;
  } catch {
    accessToken = null;
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retried?: boolean };
    if (err.response?.status === 401 && original && !original._retried && !original.url?.includes('/auth/')) {
      original._retried = true;
      refreshInFlight ??= refreshAccess().finally(() => {
        refreshInFlight = null;
      });
      const token = await refreshInFlight;
      if (token) {
        original.headers.set('Authorization', `Bearer ${token}`);
        return api.request(original);
      }
    }
    return Promise.reject(err);
  },
);
