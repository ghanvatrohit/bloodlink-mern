// One place for all calls to the backend.
import axios from 'axios';
import { API_URL } from '../constants';

// The login token is kept here (in memory, not in localStorage, for safety).
let accessToken = null;

export function setToken(token) {
  accessToken = token;
}

export function getToken() {
  return accessToken;
}

// axios instance with our backend address.
// withCredentials sends the "refresh token" cookie to the backend.
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Before every request: add the token to the header
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = 'Bearer ' + accessToken;
  }
  return config;
});

// Ask the backend for a new token using the refresh cookie.
// Returns { user, accessToken } or throws an error.
export async function refreshLogin() {
  const response = await axios.post(API_URL + '/auth/refresh', {}, { withCredentials: true });
  setToken(response.data.accessToken);
  return response.data;
}

// After every response: if the token has expired (401), get a new one and try again once.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const expired = error.response && error.response.status === 401;

    if (expired && !original._retried && !original.url.includes('/auth/')) {
      original._retried = true;
      try {
        await refreshLogin();
        original.headers.Authorization = 'Bearer ' + accessToken;
        return api(original);
      } catch (e) {
        // Refresh failed: send the user to the login page
        setToken(null);
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Turns any error into a readable message
export function errorMessage(error) {
  if (error.response && error.response.data && error.response.data.message) {
    return error.response.data.message;
  }
  return error.message || 'Something went wrong';
}

export default api;
