import { io } from 'socket.io-client';
export const URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export const api = async (path, opts = {}) => {
  const t = localStorage.getItem('hostToken');
  const r = await fetch(URL + '/api' + path, { ...opts, headers: { 'Content-Type': 'application/json', ...(t && { Authorization: 'Bearer ' + t }) }, body: opts.body && JSON.stringify(opts.body) });
  const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Request failed'); return d;
};
export { io };
