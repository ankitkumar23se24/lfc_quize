import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useLive, useCountdown } from '../hooks/useLive';
import { Options, Timer, Leaderboard, Err, confirmRemove } from '../components/ui';
export default function Live() {
  const { roomCode } = useParams(), nav = useNavigate(), { state: s, error, setError, emit, connected } = useLive(roomCode, 'host');
  const left = useCountdown(s?.endsAt, s?.offset);
  useEffect(() => { if (error === 'You are not the host of this room.') nav('/host/login'); }, [error]);
  if (!s) return <main className="p-10 text-center">Loading…<Err msg={error} clear={() => setError('')} /></main>;
  const kick = p => { const reason = confirmRemove(p); if (reason !== null) emit('remove_player', { playerId: p.id, reason }); };
  const q = s.question, B = (label, evt, extra) => <button className="btn" onClick={() => emit(evt)} {...extra}>{label}</button>;
  return <main className="max-w-3xl mx-auto p-5 space-y-4">
    {s.state === 'WAITING_ROOM' ? <div className="card text-center space-y-3"><div className="text-stone-500">Join at {location.origin}/join</div>
      <div className="text-7xl font-black tracking-widest">{roomCode}</div><div>Participants: {s.participantCount}</div>
      <div className="flex flex-wrap gap-2 justify-center">{s.players?.map(p => <span key={p.id} className={`pl-3 pr-1 py-1 rounded-full inline-flex items-center gap-1 ${p.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-500'}`}>{p.nickname} <small className="font-mono opacity-70">{p.rollNo} · {p.uid}</small><button title="Remove player" aria-label={`Remove ${p.nickname}`} onClick={() => kick(p)} className="rounded-full px-1.5 hover:bg-rose-200 text-rose-700">✕</button></span>)}</div>
      {B('Start quiz', 'start_quiz', { disabled: !s.participantCount })}</div> : <>
      <div className="flex justify-between text-sm"><span>Question {s.index + 1} / {s.total}</span><span>{connected ? 'Connected' : 'Reconnecting…'}</span></div>
      {q && s.state !== 'QUIZ_COMPLETED' && <><h1 className="text-3xl font-black">{q.text}</h1>
        {s.state === 'QUESTION_ACTIVE' && <><Timer left={left} total={q.timeLimit} /><div className="text-4xl font-black">00:{String(left).padStart(2, '0')}</div></>}
        <Options q={q} correct={q.correctAnswer} disabled />
        <div className="card flex gap-6"><span>Participants: {s.participantCount}</span><span>Answered: {s.answered}</span><span>Remaining: {s.participantCount - s.answered}</span></div></>}
      {s.leaderboard && <Leaderboard rows={s.leaderboard} onRemove={kick} />}
      <div className="flex flex-wrap gap-2">
        {s.state === 'QUESTION_ACTIVE' && B('End question', 'end_question')}
        {s.state === 'QUESTION_ENDED' && B('Show leaderboard', 'show_leaderboard')}
        {['QUESTION_ENDED', 'LEADERBOARD'].includes(s.state) && B(s.index + 1 >= s.total ? 'Finish quiz' : 'Next question', 'next_question')}
        {s.state !== 'QUIZ_COMPLETED' ? B('End quiz', 'end_quiz', { className: 'btn !bg-rose-600' }) : <Link className="btn" to="/host/dashboard">Dashboard</Link>}
        {s.state === 'QUIZ_COMPLETED' && <ResultsLink roomCode={roomCode} />}</div></>}
    <Err msg={error} clear={() => setError('')} /></main>;
}
const ResultsLink = ({ roomCode }) => { const [id, setId] = useState(); useEffect(() => { api('/sessions/' + roomCode + '/id').then(d => setId(d.id)).catch(() => {}); }, []); return id ? <Link className="btn !bg-amber-400 !text-stone-900" to={'/host/results/' + id}>Results</Link> : null; };