import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useLive, useCountdown } from '../hooks/useLive';
import { Leaderboard, Err, confirmRemove } from '../components/ui';
export default function Results() {
  const { sessionId } = useParams(), [r, setR] = useState(), [err, setErr] = useState('');
  useEffect(() => { api('/results/' + sessionId).then(setR).catch(e => setErr(e.message)); }, []);
  const remove = async p => { const reason = confirmRemove(p); if (reason === null) return; try { setR(await api(`/results/${sessionId}/players/${p.id}`, { method: 'DELETE', body: { reason } })); } catch (e) { setErr(e.message); } };
  if (!r) return <main className="p-10">Loading…</main>;
  return <main className="max-w-3xl mx-auto p-6 space-y-4"><h1 className="text-3xl font-black">{r.title} — results</h1>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[['Participants', r.totalParticipants], ['Average score', r.averageScore], ['Highest score', r.highestScore], ['Accuracy', r.averageAccuracy + '%']].map(([k, v]) => <div key={k} className="card"><div className="text-sm text-stone-500">{k}</div><div className="text-2xl font-black">{v}</div></div>)}</div>
    {r.questions.map((q, i) => <div key={i} className="card"><b>Question {i + 1}: {q.text}</b><div className="text-sm mt-1">Correct: {q.correct} / {r.totalParticipants} · Incorrect: {q.incorrect} · Unanswered: {q.unanswered}{q.fastestMs != null && ` · Fastest: ${(q.fastestMs / 1000).toFixed(1)}s`}</div></div>)}
    <Leaderboard rows={r.leaderboard} onRemove={remove} /><Err msg={err} clear={() => setErr('')} /></main>;
}

