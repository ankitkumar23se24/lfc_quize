import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useLive, useCountdown } from '../hooks/useLive';
import { Options, Timer, Leaderboard, Err } from '../components/ui';
export default function HostLogin() {
  const nav = useNavigate(), [f, setF] = useState({ email: '', password: '' }), [err, setErr] = useState('');
  const go = mode => api('/auth/' + mode, { method: 'POST', body: f }).then(d => { localStorage.setItem('hostToken', d.token); nav('/host/dashboard'); }).catch(e => setErr(e.message));
  return <main className="max-w-sm mx-auto px-6 py-24 space-y-4"><h1 className="text-4xl font-black">Host sign in</h1>
    <input className="inp" placeholder="Email" onChange={e => setF({ ...f, email: e.target.value })} /><input className="inp" type="password" placeholder="Password" onChange={e => setF({ ...f, password: e.target.value })} />
    <div className="flex gap-2"><button className="btn flex-1" onClick={() => go('login')}>Sign in</button><button className="btn flex-1 !bg-stone-700" onClick={() => go('register')}>Register</button></div><Err msg={err} clear={() => setErr('')} /></main>;
}

