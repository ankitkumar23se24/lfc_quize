import { useState } from 'react'; import { useNavigate } from 'react-router-dom'; import { io, URL } from '../api/client'; import { Err } from '../components/ui';
export default function Join() {
  const nav = useNavigate(), [code, setCode] = useState(''), [nick, setNick] = useState(''), [roll, setRoll] = useState(''), [err, setErr] = useState('');
  const join = () => { const s = io(URL), c = code.trim().toUpperCase();
    s.on('connect_error', () => setErr('Cannot reach the server.'));
    s.emit('join_room', { roomCode: c, nickname: nick, rollNo: roll }, r => { s.disconnect(); if (r.error) return setErr(r.error); localStorage.setItem('player:' + r.roomCode, r.playerId); nav('/quiz/' + r.roomCode); }); };
  return <main className="max-w-sm mx-auto px-6 py-24 space-y-4"><h1 className="text-4xl font-black">Join quiz</h1>
    <input className="inp text-center text-2xl tracking-widest uppercase" maxLength={6} placeholder="Room code" value={code} onChange={e => setCode(e.target.value)} />
    <input className="inp" maxLength={20} placeholder="Nickname" value={nick} onChange={e => setNick(e.target.value)} />
    <input className="inp uppercase" maxLength={20} placeholder="Roll number" value={roll} onChange={e => setRoll(e.target.value.replace(/\s/g, ''))} />
    <button className="btn w-full" disabled={code.length < 6 || !nick || !roll} onClick={join}>Join quiz</button><Err msg={err} clear={() => setErr('')} /></main>;
}