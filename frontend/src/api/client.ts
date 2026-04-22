import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const ACCESS_TOKEN_STORAGE_KEY = 'eventhub.accessToken';

let accessToken: string | null =
  typeof window === 'undefined' ? null : window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
let refreshInFlight: Promise<string | null> | null = null;

export const setAccessToken = (t: string | null) => {
  accessToken = t;
  if (typeof window !== 'undefined') {
    if (t) {
      window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, t);
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    }
  }
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
    setAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    setAccessToken(null);
    return null;
  }
}

export async function ensureAccessToken(): Promise<string | null> {
  if (accessToken) return accessToken;
  refreshInFlight ??= refreshAccess().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
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
