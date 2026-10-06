import { useEffect, useState } from 'react'; import { useNavigate, useParams } from 'react-router-dom'; import { api } from '../api/client'; import { Err } from '../components/ui';
const blank = () => ({ questionText: '', options: ['', '', '', ''], correctAnswer: 0, image: '', timeLimit: 15, points: 1000 });
export default function QuizEditor() {
  const { id } = useParams(), nav = useNavigate(), [err, setErr] = useState('');
  const [quiz, setQuiz] = useState({ title: '', description: '', category: '', image: '', questions: [blank()] });
  useEffect(() => { id && api('/quizzes/' + id).then(setQuiz).catch(e => setErr(e.message)); }, [id]);
  const setQ = (i, patch) => setQuiz(z => ({ ...z, questions: z.questions.map((q, j) => j === i ? { ...q, ...patch } : q) }));
  const move = (i, d) => setQuiz(z => { const qs = [...z.questions], j = i + d; if (j < 0 || j >= qs.length) return z; [qs[i], qs[j]] = [qs[j], qs[i]]; return { ...z, questions: qs }; });
  const save = async () => {
    if (!quiz.title.trim()) return setErr('Add a quiz title.');
    if (quiz.questions.some(q => !q.questionText.trim() || q.options.some(o => !o.trim()))) return setErr('Fill in every question and all 4 options.');
    try { await api(id ? '/quizzes/' + id : '/quizzes', { method: id ? 'PUT' : 'POST', body: quiz }); nav('/host/dashboard'); } catch (e) { setErr(e.message); }
  };
  return <main className="max-w-3xl mx-auto p-6 space-y-4">
    <h1 className="text-3xl font-black">{id ? 'Edit quiz' : 'Create quiz'}</h1>
    <div className="card space-y-3">
      <input className="inp" placeholder="Quiz title" value={quiz.title} onChange={e => setQuiz({ ...quiz, title: e.target.value })} />
      <textarea className="inp" placeholder="Description" value={quiz.description || ''} onChange={e => setQuiz({ ...quiz, description: e.target.value })} />
      <div className="grid sm:grid-cols-2 gap-3"><input className="inp" placeholder="Category (optional)" value={quiz.category || ''} onChange={e => setQuiz({ ...quiz, category: e.target.value })} />
        <input className="inp" placeholder="Quiz image URL (optional)" value={quiz.image || ''} onChange={e => setQuiz({ ...quiz, image: e.target.value })} /></div></div>
    {quiz.questions.map((q, i) => <div key={i} className="card space-y-3">
      <div className="flex justify-between items-center"><b>Question {i + 1}</b><div className="flex gap-2">
        <button className="px-2" onClick={() => move(i, -1)}>↑</button><button className="px-2" onClick={() => move(i, 1)}>↓</button>
        <button className="px-2 text-rose-600" onClick={() => setQuiz(z => ({ ...z, questions: z.questions.filter((_, j) => j !== i) }))}>Delete</button></div></div>
      <input className="inp" placeholder="Question text" value={q.questionText} onChange={e => setQ(i, { questionText: e.target.value })} />
      <input className="inp" placeholder="Image URL (optional)" value={q.image || ''} onChange={e => setQ(i, { image: e.target.value })} />
      {q.options.map((o, k) => <label key={k} className="flex items-center gap-3"><input type="radio" name={'c' + i} checked={q.correctAnswer === k} onChange={() => setQ(i, { correctAnswer: k })} />
        <input className="inp" placeholder={`Option ${'ABCD'[k]}${q.correctAnswer === k ? ' (correct)' : ''}`} value={o} onChange={e => setQ(i, { options: q.options.map((x, m) => m === k ? e.target.value : x) })} /></label>)}
      <div className="flex gap-3"><select className="inp" value={q.timeLimit} onChange={e => setQ(i, { timeLimit: +e.target.value })}>{[5, 10, 15, 20, 30, 60].map(t => <option key={t} value={t}>{t} seconds</option>)}</select>
        <input className="inp" type="number" min="100" step="100" value={q.points} onChange={e => setQ(i, { points: +e.target.value })} /></div></div>)}
    <div className="flex gap-3"><button className="btn !bg-stone-700" onClick={() => setQuiz(z => ({ ...z, questions: [...z.questions, blank()] }))}>Add question</button><button className="btn" onClick={save}>Save quiz</button></div>
    <Err msg={err} clear={() => setErr('')} /></main>;
}