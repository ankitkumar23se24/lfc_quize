import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api, io, URL } from '../api/client';
import { Err } from '../components/ui';

export default function Dashboard() {
  const nav = useNavigate(), [qs, setQs] = useState([]), [sessions, setSessions] = useState([]), [err, setErr] = useState(''), [sp] = useSearchParams();
  useEffect(() => { api('/quizzes').then(setQs).catch(() => nav('/host/login')); api('/sessions').then(setSessions).catch(() => {}); }, []);
  const live = id => { const s = io(URL, { auth: { token: localStorage.getItem('hostToken') } });
    s.emit('create_room', { quizId: id }, r => { s.disconnect(); r.error ? setErr(r.error) : nav('/host/live/' + r.roomCode); }); };
  const del = async id => { if (confirm('Delete this quiz?')) { await api('/quizzes/' + id, { method: 'DELETE' }); setQs(q => q.filter(x => x._id !== id)); } };
  return <main className="max-w-3xl mx-auto p-6 space-y-4">
    <div className="flex justify-between items-center"><h1 className="text-3xl font-black">My quizzes</h1><Link className="btn" to="/host/quiz/create">Create quiz</Link></div>
    {sp.get('demo') && <p className="text-indigo-600">Demo ready. Start it, then open /join in other tabs to play.</p>}
    {qs.length === 0 && <p className="text-stone-500">No quizzes yet. Click Create quiz to build your first one.</p>}
    {qs.map(q => <div key={q._id} className="card flex flex-wrap items-center justify-between gap-3"><div><b>{q.title}</b><div className="text-sm text-stone-500">{q.questions.length} questions</div></div>
      <div className="flex flex-wrap gap-2"><Link className="btn !bg-stone-700" to={`/host/quiz/${q._id}/preview`}>Preview</Link><Link className="btn !bg-stone-700" to={`/host/quiz/${q._id}/edit`}>Edit</Link>
        <button className="btn !bg-rose-600" onClick={() => del(q._id)}>Delete</button><button className="btn" onClick={() => live(q._id)}>Start live quiz</button></div></div>)}
    {sessions.length > 0 && <><h2 className="text-xl font-black pt-4">Recent quizzes</h2>
      {sessions.map(s => <Link key={s.id} to={s.state === 'QUIZ_COMPLETED' ? `/host/results/${s.id}` : `/host/live/${s.roomCode}`} className="card flex justify-between"><span>{s.title} · {s.roomCode}</span><span className="text-stone-500">{s.state === 'QUIZ_COMPLETED' ? 'View results' : 'Resume'}</span></Link>)}</>}
    <Err msg={err} clear={() => setErr('')} /></main>;
}
