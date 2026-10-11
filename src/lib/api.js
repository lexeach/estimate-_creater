const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:10000/api').replace(/\/$/, '');
export const getToken = () => localStorage.getItem('salesdesk_token');
export const setToken = token => token ? localStorage.setItem('salesdesk_token', token) : localStorage.removeItem('salesdesk_token');
export async function api(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}), ...(options.headers || {}) };
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers, body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !path.includes('/auth/login')) { setToken(null); window.dispatchEvent(new Event('salesdesk:logout')); }
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  return data;
}
export const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: import.meta.env.VITE_CURRENCY || 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
export const dateText = value => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
