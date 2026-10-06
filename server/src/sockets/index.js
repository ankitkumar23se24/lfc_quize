import jwt from 'jsonwebtoken';
import { Session, Participant, Quiz } from '../models/index.js';
import { createSession, buildState, clean, cleanRoll, validRoll, removeParticipant, ACTIVE } from '../services/session.service.js';
import { createWithUid } from '../services/uid.service.js';
import { calculateScore } from '../services/scoring.service.js';

const timers = new Map(); // roomCode -> { t, tick }
const stopTimer = code => { const h = timers.get(code); if (h) { clearTimeout(h.t); clearInterval(h.tick); timers.delete(code); } };
const lastSubmit = new Map(); // socket.id -> ts (rate limit)

export function registerSocket(io) {
  const sync = async code => {
    const session = await Session.findOne({ roomCode: code });
    if (!session) return;
    for (const s of await io.in(code).fetchSockets()) {
      s.emit('quiz_state_sync', await buildState(session, { isHost: s.data.role === 'host', playerId: s.data.playerId }));
    }
  };
  const endQuestion = async code => {
    stopTimer(code);
    const s = await Session.findOneAndUpdate({ roomCode: code, state: 'QUESTION_ACTIVE' }, { state: 'QUESTION_ENDED' });
    if (!s) return;
    io.in(code).emit('question_ended', { roomCode: code });
    await sync(code);
  };
  const startQuestion = async (session, index, quiz) => {
    const limit = quiz.questions[index].timeLimit * 1000, now = Date.now();
    session.set({ state: 'QUESTION_ACTIVE', currentQuestion: index, questionStartedAt: new Date(now), questionEndsAt: new Date(now + limit), startedAt: session.startedAt || new Date(now) });
    await session.save();
    const code = session.roomCode, endsAt = now + limit;
    timers.set(code, { t: setTimeout(() => endQuestion(code), limit), tick: setInterval(() => io.in(code).emit('timer_update', { left: Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) }), 1000) });
    io.in(session.roomCode).emit('question_started', { index });
    await sync(session.roomCode);
  };
  const hostSession = async (socket, code) => {
    const s = await Session.findOne({ roomCode: code });
    return s && socket.data.role === 'host' && String(s.hostId) === socket.data.userId ? s : null;
  };

  // If everyone still in the game has answered, close the question early.
  const maybeEndEarly = async code => {
    const session = await Session.findOne({ roomCode: code });
    if (session?.state !== 'QUESTION_ACTIVE') return;
    const total = await Participant.countDocuments({ sessionId: session._id, ...ACTIVE, connected: true });
    const done = await Participant.countDocuments({ sessionId: session._id, ...ACTIVE, 'answers.index': session.currentQuestion });
    if (total && done >= total) endQuestion(code);
  };
  // Shared by the live `remove_player` event and the REST endpoint on the results page.
  io.afterPlayerRemoved = async (code, p) => {
    for (const s of await io.in(code).fetchSockets()) {
      if (s.data.playerId === String(p._id)) { s.emit('removed_from_quiz', { reason: p.removedReason || '' }); s.leave(code); s.data.playerId = undefined; }
    }
    io.in(code).emit('participant_left'); await sync(code); await maybeEndEarly(code);
  };

  io.use((socket, next) => {
    try { if (socket.handshake.auth?.token) { socket.data.userId = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET).id; } next(); }
    catch { next(new Error('Invalid token')); }
  });

  io.on('connection', socket => {
    const on = (evt, fn) => socket.on(evt, async (data = {}, cb = () => {}) => {
      try { await fn(data, cb); } catch (e) { console.error(evt, e); cb({ error: 'Something went wrong. Please try again.' }); }
    });

    on('create_room', async ({ quizId }, cb) => {
      if (!socket.data.userId) return cb({ error: 'Please sign in as host.' });
      const quiz = await Quiz.findOne({ _id: quizId, creatorId: socket.data.userId });
      if (!quiz?.questions.length) return cb({ error: 'Quiz not found or has no questions.' });
      const session = await createSession(quiz._id, socket.data.userId);
      socket.data.role = 'host'; socket.join(session.roomCode);
      socket.emit('room_created', { roomCode: session.roomCode }); cb({ roomCode: session.roomCode });
    });

    on('host_join', async ({ roomCode }, cb) => {
      const session = await hostSession({ data: { ...socket.data, role: 'host' } }, roomCode);
      if (!session) return cb({ error: 'You are not the host of this room.' });
      socket.data.role = 'host'; socket.join(roomCode); await sync(roomCode); cb({ ok: true });
    });

    on('join_room', async ({ roomCode, nickname, rollNo }, cb) => {
      const session = await Session.findOne({ roomCode: String(roomCode).toUpperCase() });
      if (!session) return cb({ error: 'Room not found. Check the code and try again.' });
      if (session.state === 'QUIZ_COMPLETED') return cb({ error: 'This quiz has already ended.' });
      if (session.state !== 'WAITING_ROOM') return cb({ error: 'This quiz has already started.' });
      const name = clean(nickname);
      if (!name) return cb({ error: 'Enter a nickname.' });
      const roll = cleanRoll(rollNo);
      if (!roll) return cb({ error: 'Enter your roll number.' });
      if (!validRoll(roll)) return cb({ error: 'Roll number can only use letters, digits and - _ . /' });
      // One roll number per session (removed players still count, so they cannot rejoin under the same number).
      if (await Participant.findOne({ sessionId: session._id, rollNo: roll })) return cb({ error: 'That roll number has already joined.' });
      if (await Participant.findOne({ sessionId: session._id, nickname: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })) return cb({ error: 'That nickname is taken.' });
      const p = await createWithUid(Participant, { sessionId: session._id, nickname: name, rollNo: roll });
      socket.data = { ...socket.data, role: 'player', playerId: String(p._id) }; socket.join(session.roomCode);
      io.in(session.roomCode).emit('participant_joined', { nickname: name });
      cb({ playerId: String(p._id), uid: p.uid, rollNo: p.rollNo, roomCode: session.roomCode }); await sync(session.roomCode);
    });

    on('reconnect_player', async ({ roomCode, playerId }, cb) => {
      const session = await Session.findOne({ roomCode });
      const p = session && await Participant.findOneAndUpdate({ _id: playerId, sessionId: session._id }, { connected: true });
      if (p?.removed) return cb({ error: 'REMOVED' });
      if (!p) return cb({ error: 'Session not found. Join again.' });
      socket.data = { ...socket.data, role: 'player', playerId: String(p._id), roomCode }; socket.join(roomCode);
      cb({ ok: true }); await sync(roomCode);
    });

    on('start_quiz', async ({ roomCode }, cb) => {
      const s = await hostSession(socket, roomCode);
      if (!s || s.state !== 'WAITING_ROOM') return cb({ error: 'Cannot start the quiz now.' });
      io.in(roomCode).emit('quiz_started'); await startQuestion(s, 0, await Quiz.findById(s.quizId)); cb({ ok: true });
    });
    on('end_question', async ({ roomCode }, cb) => { if (!await hostSession(socket, roomCode)) return cb({ error: 'Not allowed.' }); await endQuestion(roomCode); });
    on('show_leaderboard', async ({ roomCode }, cb) => {
      const s = await hostSession(socket, roomCode);
      if (!s || s.state !== 'QUESTION_ENDED') return cb({ error: 'Finish the question first.' });
      s.state = 'LEADERBOARD'; await s.save(); io.in(roomCode).emit('leaderboard_updated'); await sync(roomCode);
    });
    on('next_question', async ({ roomCode }, cb) => {
      const s = await hostSession(socket, roomCode);
      if (!s || !['QUESTION_ENDED', 'LEADERBOARD'].includes(s.state)) return cb({ error: 'Cannot advance yet.' });
      const quiz = await Quiz.findById(s.quizId);
      if (s.currentQuestion + 1 >= quiz.questions.length) { s.state = 'QUIZ_COMPLETED'; await s.save(); io.in(roomCode).emit('quiz_completed', { sessionId: s._id }); return sync(roomCode); }
      await startQuestion(s, s.currentQuestion + 1, quiz);
    });
    on('end_quiz', async ({ roomCode }, cb) => {
      const s = await hostSession(socket, roomCode); if (!s) return cb({ error: 'Not allowed.' });
      stopTimer(roomCode); s.state = 'QUIZ_COMPLETED'; await s.save();
      io.in(roomCode).emit('quiz_completed', { sessionId: s._id }); await sync(roomCode);
    });

    on('remove_player', async ({ roomCode, playerId, reason }, cb) => {
      const s = await hostSession(socket, roomCode);
      if (!s) return cb({ error: 'Not allowed.' });
      const p = await removeParticipant(s._id, playerId, reason);
      if (!p) return cb({ error: 'Player not found or already removed.' });
      await io.afterPlayerRemoved(roomCode, p); cb({ ok: true });
    });

    on('submit_answer', async ({ option }, cb) => {
      const now = Date.now();
      if (now - (lastSubmit.get(socket.id) || 0) < 300) return cb({ error: 'Slow down.' });
      lastSubmit.set(socket.id, now);
      const { playerId, roomCode } = socket.data;
      const rooms = [...socket.rooms].filter(r => r !== socket.id); const code = roomCode || rooms[0];
      const session = playerId && await Session.findOne({ roomCode: code });
      if (!session || session.state !== 'QUESTION_ACTIVE' || now > session.questionEndsAt.getTime()) return cb({ error: 'Time is up for this question.' });
      const quiz = await Quiz.findById(session.quizId), q = quiz.questions[session.currentQuestion];
      if (!Number.isInteger(option) || option < 0 || option >= q.options.length) return cb({ error: 'Invalid answer.' });
      const correct = option === q.correctAnswer, elapsedMs = now - session.questionStartedAt.getTime();
      const points = calculateScore({ correct, points: q.points, elapsedMs, limitMs: q.timeLimit * 1000 });
      // Atomic: only succeeds if no answer exists yet for this question (prevents duplicates / races).
      const res = await Participant.updateOne({ _id: playerId, ...ACTIVE, 'answers.index': { $ne: session.currentQuestion } },
        { $push: { answers: { questionId: String(q._id), index: session.currentQuestion, option, correct, points, ms: elapsedMs } }, $inc: { score: points } });
      if (!res.modifiedCount) return cb({ error: 'You already answered.' });
      cb({ ok: true }); io.in(code).emit('answer_received', { count: await Participant.countDocuments({ sessionId: session._id, ...ACTIVE, 'answers.index': session.currentQuestion }) });
      await sync(code); await maybeEndEarly(code);
    });

    socket.on('disconnect', async () => {
      lastSubmit.delete(socket.id);
      if (socket.data.playerId) { await Participant.updateOne({ _id: socket.data.playerId }, { connected: false }); const c = socket.data.roomCode; if (c) { io.in(c).emit('participant_left'); sync(c); } }
    });
  });
}