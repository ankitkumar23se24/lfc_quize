import { useEffect, useState } from 'react'; import { useParams, Link } from 'react-router-dom'; import { useLive, useCountdown } from '../hooks/useLive'; import { Options, Timer, Leaderboard, Err } from '../components/ui';
export default function Play() {
  const { roomCode } = useParams(), { state: s, error, setError, emit, connected, socket } = useLive(roomCode, 'player');
  const left = useCountdown(s?.endsAt, s?.offset);
  const [removed, setRemoved] = useState(false);
  useEffect(() => { const k = socket.current; if (!k) return; const h = () => { localStorage.removeItem('player:' + roomCode); setRemoved(true); }; k.on('removed_from_quiz', h); return () => k.off('removed_from_quiz', h); }, [socket.current, roomCode]);
  if (removed || error === 'REMOVED') return <main className="p-10 text-center space-y-4"><h1 className="text-3xl font-black">You were removed from this quiz</h1><p className="text-stone-500">The host removed you from the leaderboard.</p><Link className="btn" to="/join">Back</Link></main>;
  if (error === 'NOT_JOINED') return <main className="p-10 text-center"><Link className="btn" to="/join">Join this quiz</Link></main>;
  if (!s) return <main className="p-10 text-center">Connecting…<Err msg={error} clear={() => setError('')} /></main>;
  const me = s.me, q = s.question;
  return <main className="max-w-2xl mx-auto p-5 space-y-4">
    <div className="flex justify-between text-sm text-stone-500"><span>{me?.nickname} <small className="font-mono">Roll {me?.rollNo} · {me?.uid}</small></span><span>{connected ? '' : 'Reconnecting…'} {me?.score} pts</span></div>
    {s.state === 'WAITING_ROOM' && <div className="card text-center text-xl py-16">Waiting for the host to start the quiz…</div>}
    {q && ['QUESTION_ACTIVE', 'QUESTION_ENDED'].includes(s.state) && <>
      <div className="text-sm font-bold text-stone-500">Question {s.index + 1} / {s.total}</div>
      <h1 className="text-3xl font-black">{q.text}</h1>
      {q.image && <img src={q.image} className="rounded-xl max-h-56 mx-auto" />}
      {s.state === 'QUESTION_ACTIVE' && <><Timer left={left} total={q.timeLimit} /><div className="text-center text-5xl font-black tabular-nums">00:{String(left).padStart(2, '0')}</div></>}
      <Options q={q} selected={me?.selected} correct={q.correctAnswer} disabled={me?.answered || s.state !== 'QUESTION_ACTIVE'} onPick={o => emit('submit_answer', { option: o })} />
      {s.state === 'QUESTION_ACTIVE' && me?.answered && <p className="text-center font-bold text-emerald-600">Answer submitted!</p>}
      {s.state === 'QUESTION_ENDED' && <p className="text-center text-xl font-bold">{me?.answered ? (me.correct ? `Correct! +${me.gained}` : 'Not quite.') : "Time's up — no answer."}</p>}</>}
    {['LEADERBOARD', 'QUIZ_COMPLETED'].includes(s.state) && <>
      {s.state === 'QUIZ_COMPLETED' && me && <div className="card text-center"><h1 className="text-3xl font-black">Quiz completed</h1><p className="mt-2">Rank #{me.rank} · {me.score} pts · {me.correctCount}/{s.total} correct · {Math.round(100 * me.correctCount / s.total)}% accuracy</p></div>}
      <Leaderboard rows={s.leaderboard} meId={localStorage.getItem('player:' + roomCode)} /></>}
    <Err msg={error} clear={() => setError('')} /></main>;
}