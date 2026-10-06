import { Router } from 'express';
import { Session, Quiz } from '../models/index.js';
import { auth, wrap } from '../middleware/auth.js';
import { resultsFor, removeParticipant } from '../services/session.service.js';
const r = Router();
r.get('/sessions', auth, wrap(async (req, res) => { // host's recent sessions
  const ss = await Session.find({ hostId: req.userId }).sort('-createdAt').limit(10).lean();
  const qs = await Quiz.find({ _id: { $in: ss.map(s => s.quizId) } }).select('title').lean();
  const t = Object.fromEntries(qs.map(q => [String(q._id), q.title]));
  res.json(ss.filter(s => t[String(s.quizId)]).map(s => ({ id: s._id, roomCode: s.roomCode, state: s.state, title: t[String(s.quizId)], createdAt: s.createdAt })));
}));
r.get('/sessions/:code', wrap(async (req, res) => { // public: only reveals whether a room is joinable
  const s = await Session.findOne({ roomCode: req.params.code.toUpperCase() });
  s ? res.json({ state: s.state }) : res.status(404).json({ error: 'Room not found.' });
}));
r.get('/sessions/:code/id', auth, wrap(async (req, res) => {
  const s = await Session.findOne({ roomCode: req.params.code.toUpperCase(), hostId: req.userId });
  s ? res.json({ id: s._id }) : res.status(404).json({ error: 'Not found.' });
}));
r.get('/results/:sessionId', auth, wrap(async (req, res) => {
  const s = await Session.findOne({ _id: req.params.sessionId, hostId: req.userId });
  s ? res.json(await resultsFor(s._id)) : res.status(404).json({ error: 'Results not found.' });
}));
// Host removes a player (e.g. cheating) after the fact; they vanish from the leaderboard and all stats.
r.delete('/results/:sessionId/players/:playerId', auth, wrap(async (req, res) => {
  const s = await Session.findOne({ _id: req.params.sessionId, hostId: req.userId });
  if (!s) return res.status(404).json({ error: 'Results not found.' });
  const p = await removeParticipant(s._id, req.params.playerId, req.body?.reason);
  if (!p) return res.status(404).json({ error: 'Player not found or already removed.' });
  await req.app.get('io')?.afterPlayerRemoved?.(s.roomCode, p); // kick live socket + refresh screens if the session is still running
  res.json(await resultsFor(s._id));
}));

export default r;