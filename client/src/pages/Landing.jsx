import { Link, useNavigate } from 'react-router-dom'; import { api } from '../api/client';
export default function Landing() {
  const nav = useNavigate();
  const demo = async () => { const d = await api('/demo', { method: 'POST' }); localStorage.setItem('hostToken', d.token); nav('/host/dashboard?demo=' + d.quizId); };
  return <main className="max-w-4xl mx-auto px-6 py-24 text-center">
    <h1 className="text-6xl sm:text-8xl font-black tracking-tight">Create. Host. Compete.</h1>
    <p className="mt-6 text-xl text-stone-500 max-w-2xl mx-auto">Run engaging live quizzes with real-time questions, instant scoring, and live leaderboards.</p>
    <div className="mt-10 flex gap-3 justify-center flex-wrap"><Link to="/host/login" className="btn">Create quiz</Link><Link to="/join" className="btn !bg-amber-400 !text-stone-900">Join quiz</Link><button onClick={demo} className="btn !bg-stone-800">Try demo</button></div>
  </main>;
}