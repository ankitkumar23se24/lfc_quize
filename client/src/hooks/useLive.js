import { useEffect, useRef, useState } from 'react';
import { io, URL } from '../api/client';
// Connects, authenticates the role, and keeps the server-authoritative state in sync (also on refresh/reconnect).
export function useLive(roomCode, role) {
  const [state, setState] = useState(null), [error, setError] = useState(''), [connected, setConnected] = useState(false), sock = useRef();
  const offset = useRef(0);
  useEffect(() => {
    const s = io(URL, { auth: { token: role === 'host' ? localStorage.getItem('hostToken') : undefined } }); sock.current = s;
    const attach = () => {
      setConnected(true);
      const cb = r => r?.error && setError(r.error);
      if (role === 'host') s.emit('host_join', { roomCode }, cb);
      else { const pid = localStorage.getItem('player:' + roomCode); pid ? s.emit('reconnect_player', { roomCode, playerId: pid }, cb) : setError('NOT_JOINED'); }
    };
    s.on('connect', attach); s.on('disconnect', () => setConnected(false)); s.on('connect_error', () => setError('Cannot reach the server.'));
    s.on('quiz_state_sync', st => { offset.current = st.serverNow - Date.now(); setState({ ...st, offset: offset.current }); });
    return () => s.disconnect();
  }, [roomCode, role]);
  const emit = (evt, data = {}) => new Promise(res => sock.current.emit(evt, { roomCode, ...data }, r => { r?.error && setError(r.error); res(r); }));
  return { state, error, setError, connected, emit, socket: sock };
}
export function useCountdown(endsAt, offset = 0) {
  const [left, setLeft] = useState(0);
  useEffect(() => { if (!endsAt) return; const t = () => setLeft(Math.max(0, Math.ceil((endsAt - offset - Date.now()) / 1000))); t(); const i = setInterval(t, 200); return () => clearInterval(i); }, [endsAt, offset]);
  return left;
}
