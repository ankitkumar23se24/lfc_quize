import { Session, Participant, Quiz } from '../models/index.js';
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// Roll numbers: 1-20 chars, letters/digits and - _ . / only, stored upper-case.
export const cleanRoll = s => String(s || '').trim().toUpperCase().replace(/\s+/g, '').slice(0, 20);
export const validRoll = s => /^[A-Z0-9][A-Z0-9._\/-]{0,19}$/.test(s);
export const clean = (s, n = 20) => String(s || '').replace(/[<>&"'`]/g, '').trim().slice(0, n);

export async function createSession(quizId, hostId) {
  for (let i = 0; i < 10; i++) {
    const roomCode = Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
    try { return await Session.create({ roomCode, quizId, hostId }); } catch (e) { if (e.code !== 11000) throw e; }
  }
  throw new Error('Could not allocate room code');
}

// Removed (cheating / disqualified) players never appear. Public IDs are only revealed to the host.
export const ACTIVE = { removed: { $ne: true } };
export async function leaderboard(sessionId, qIndex, { isHost = false } = {}) {
  const ps = await Participant.find({ sessionId, ...ACTIVE }).lean();
  return ps.sort((a, b) => b.score - a.score).map((p, i) => ({
    id: String(p._id), ...(isHost && { uid: p.uid, rollNo: p.rollNo }), rank: i + 1, nickname: p.nickname, score: p.score, connected: p.connected,
    gained: p.answers.find(a => a.index === qIndex)?.points ?? 0,
  }));
}

// Personalised, server-authoritative snapshot. Correct answer is only included once the question is over.
export async function buildState(session, { isHost, playerId }) {
  const quiz = await Quiz.findById(session.quizId).lean();
  const i = session.currentQuestion, q = quiz.questions[i];
  const board = await leaderboard(session._id, i, { isHost });
  const active = session.state === 'QUESTION_ACTIVE';
  const answered = q ? await Participant.countDocuments({ sessionId: session._id, ...ACTIVE, 'answers.index': i }) : 0;
  const s = {
    state: session.state, roomCode: session.roomCode, title: quiz.title, total: quiz.questions.length, index: i,
    serverNow: Date.now(), endsAt: session.questionEndsAt?.getTime(), participantCount: board.length, answered,
    players: isHost && session.state === 'WAITING_ROOM' ? board.map(p => ({ id: p.id, uid: p.uid, rollNo: p.rollNo, nickname: p.nickname, connected: p.connected })) : undefined,
    question: q && session.state !== 'WAITING_ROOM' ? {
      text: q.questionText, options: q.options, image: q.image, timeLimit: q.timeLimit,
      correctAnswer: active ? undefined : q.correctAnswer,
    } : undefined,
    leaderboard: ['LEADERBOARD', 'QUIZ_COMPLETED'].includes(session.state) ? board : undefined,
  };
  if (playerId) {
    const me = board.find(p => p.id === String(playerId));
    const p = await Participant.findById(playerId).lean();
    const a = p?.answers.find(x => x.index === i);
    s.me = me && { uid: p?.uid, rollNo: p?.rollNo, nickname: me.nickname, score: me.score, rank: me.rank, answered: !!a, selected: a?.option,
      correct: a?.correct, gained: a?.points ?? 0,
      correctCount: p.answers.filter(x => x.correct).length };
  }
  return s;
}

export async function resultsFor(sessionId) {
  const session = await Session.findById(sessionId).lean();
  const quiz = await Quiz.findById(session.quizId).lean();
  const ps = await Participant.find({ sessionId, ...ACTIVE }).lean();
  const n = ps.length, total = quiz.questions.length;
  const questions = quiz.questions.map((q, i) => {
    const as = ps.map(p => p.answers.find(a => a.index === i)).filter(Boolean);
    const correct = as.filter(a => a.correct);
    return { text: q.questionText, correct: correct.length, incorrect: as.length - correct.length, unanswered: n - as.length,
      fastestMs: correct.length ? Math.min(...correct.map(a => a.ms)) : null };
  });
  const scores = ps.map(p => p.score);
  const accuracy = ps.map(p => total ? p.answers.filter(a => a.correct).length / total : 0);
  return { title: quiz.title, totalParticipants: n, averageScore: n ? Math.round(scores.reduce((a, b) => a + b, 0) / n) : 0,
    highestScore: Math.max(0, ...scores), averageAccuracy: n ? Math.round(100 * accuracy.reduce((a, b) => a + b, 0) / n) : 0,
    questions, leaderboard: await leaderboard(sessionId, -1, { isHost: true }) };
}

// Soft-deletes a player from a session (host only — callers must verify ownership). Returns the player or null.
export async function removeParticipant(sessionId, playerRef, reason = '') {
  const match = /^[0-9a-f]{24}$/i.test(String(playerRef)) ? { _id: playerRef } : { uid: String(playerRef).toUpperCase() };
  return Participant.findOneAndUpdate({ sessionId, ...match, ...ACTIVE },
    { removed: true, removedAt: new Date(), removedReason: clean(reason, 200), connected: false }, { new: true });
}