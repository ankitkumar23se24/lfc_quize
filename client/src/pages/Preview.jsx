import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Options } from '../components/ui';

export default function Preview() {
  const { id } = useParams(), [quiz, setQuiz] = useState();
  useEffect(() => { api('/quizzes/' + id).then(setQuiz); }, [id]);
  if (!quiz) return <main className="p-10">Loading…</main>;
  return <main className="max-w-3xl mx-auto p-6 space-y-6"><div className="flex justify-between"><h1 className="text-3xl font-black">{quiz.title}</h1><Link className="btn !bg-stone-700" to="/host/dashboard">Back</Link></div>
    <p className="text-stone-500">{quiz.description}</p>
    {quiz.questions.map((q, i) => <div key={q._id} className="card space-y-3"><div className="text-sm text-stone-500">Question {i + 1} · {q.timeLimit}s · {q.points} pts</div><h2 className="text-xl font-bold">{q.questionText}</h2>
      {q.image && <img src={q.image} className="rounded-xl max-h-40" />}<Options q={q} correct={q.correctAnswer} disabled /></div>)}</main>;
}
