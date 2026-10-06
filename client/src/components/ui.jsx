export const Options = ({ q, selected, correct, onPick, disabled }) => (
  <div className="grid sm:grid-cols-2 gap-3">{q.options.map((o, i) => {
    const show = correct !== undefined;
    const cls = show ? (i === correct ? 'bg-emerald-500 text-white' : i === selected ? 'bg-rose-500 text-white' : 'opacity-40') : selected === i ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-stone-900 hover:bg-indigo-50 dark:hover:bg-stone-800';
    return <button key={i} disabled={disabled} onClick={() => onPick?.(i)} className={`rounded-2xl p-5 text-left text-lg font-semibold shadow transition ${cls}`}><b className="mr-3 opacity-60">{'ABCD'[i]}</b>{o}</button>;
  })}</div>);
export const Timer = ({ left, total }) => <div className="h-3 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden"><div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${(left / total) * 100}%` }} /><span className="sr-only">{left}s</span></div>;
// onRemove (host only) adds a remove button per row; uid (host only) is shown under the nickname.
export const Leaderboard = ({ rows, meId, onRemove }) => (
  <div className="card"><h2 className="text-2xl font-black mb-3">Leaderboard</h2>
    <div className="relative" style={{ height: rows.length * 56 }}>{rows.map(p => (
      <div key={p.id} style={{ transform: `translateY(${(p.rank - 1) * 56}px)` }} className={`absolute inset-x-0 h-12 flex items-center gap-3 px-3 rounded-xl transition-transform duration-700 ${p.id === meId ? 'bg-indigo-100 dark:bg-indigo-950' : ''}`}>
        <span className="w-8 text-xl">{['🥇', '🥈', '🥉'][p.rank - 1] || p.rank + '.'}</span><span className="flex-1 min-w-0 font-semibold truncate">{p.nickname}{p.uid && <span className="block text-xs font-mono font-normal text-stone-500">{p.rollNo && `Roll ${p.rollNo} · `}{p.uid}</span>}</span>
        {p.gained > 0 && <span className="text-emerald-600 text-sm">+{p.gained}</span>}<span className="font-black tabular-nums">{p.score}</span>
        {onRemove && <button title="Remove from leaderboard" aria-label={`Remove ${p.nickname}`} onClick={() => onRemove(p)} className="ml-1 rounded-lg px-2 py-1 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950">✕</button>}</div>))}</div></div>);
export const Err = ({ msg, clear }) => msg && !['NOT_JOINED', 'REMOVED'].includes(msg) ? <div onClick={clear} className="fixed bottom-4 inset-x-4 mx-auto max-w-md rounded-xl bg-rose-600 text-white p-3 text-center shadow-lg">{msg}</div> : null;

// Host confirms before removing; reason is optional and kept as an audit note.
export const confirmRemove = p => {
  if (!window.confirm(`Remove ${p.nickname}${p.rollNo ? ' (Roll ' + p.rollNo + ')' : ''} from the quiz?\nTheir score is deleted from the leaderboard and results, and they cannot rejoin.`)) return null;
  return window.prompt('Reason (optional, only you can see it):', 'Cheating') ?? '';
};