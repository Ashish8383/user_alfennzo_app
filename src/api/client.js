import axios from 'axios';

const BASE_URL = 'https://sandbox.safeqr.in/api/v1';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
});

// ── Request interceptor — attach token if available ────────────────────────
client.interceptors.request.use(
  (config) => {
    // If you have a token store, inject it here
    // const token = useAuthStore.getState().token;
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor — normalize errors ────────────────────────────────
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error   ||
      error?.message                 ||
      'Something went wrong';

    return Promise.reject({ message, status: error?.response?.status });
  },
);

export default client;