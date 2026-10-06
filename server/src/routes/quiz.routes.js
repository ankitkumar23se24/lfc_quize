import { Router } from 'express';
import { User, Quiz, Session, Participant } from '../models/index.js';
import { sign, auth, wrap } from '../middleware/auth.js';
import { clean } from '../services/session.service.js';
import { createWithUid } from '../services/uid.service.js';
const r = Router();
const DEMO = [
  ['What is the capital of India?', ['Mumbai', 'New Delhi', 'Kolkata', 'Chennai'], 1],
  ['Which planet is known as the Red Planet?', ['Venus', 'Jupiter', 'Mars', 'Mercury'], 2],
  ['What is 12 × 12?', ['124', '144', '122', '164'], 1],
  ['Which language runs in the browser?', ['Python', 'Go', 'Rust', 'JavaScript'], 3],
  ['How many continents are there?', ['5', '6', '7', '8'], 2],
].map(([questionText, options, correctAnswer]) => ({ questionText, options, correctAnswer, timeLimit: 15, points: 1000 }));
// One-click demo: creates a guest host with a 5-question demo quiz.
r.post('/demo', wrap(async (_req, res) => {
  const u = await createWithUid(User, { email: `guest-${Date.now()}@demo.local`, passwordHash: 'x' });
  const q = await Quiz.create({ title: 'Demo Quiz', description: 'Five quick questions', creatorId: u._id, questions: DEMO });
  res.json({ token: sign(u), quizId: q._id });
}));

const validQuiz = b => ({ title: clean(b.title, 100), description: clean(b.description, 300), category: clean(b.category, 40), image: b.image,
  questions: (b.questions || []).map(q => ({ questionText: clean(q.questionText, 300), options: (q.options || []).slice(0, 4).map(o => clean(o, 120)), correctAnswer: q.correctAnswer, image: q.image,
    timeLimit: [5, 10, 15, 20, 30, 60].includes(q.timeLimit) ? q.timeLimit : 15, points: Number(q.points) || 1000 })) });
r.get('/quizzes', auth, wrap(async (req, res) => res.json(await Quiz.find({ creatorId: req.userId }).sort('-updatedAt').select('-questions.correctAnswer'))));
r.post('/quizzes', auth, wrap(async (req, res) => res.json(await Quiz.create({ ...validQuiz(req.body), creatorId: req.userId }))));
r.get('/quizzes/:id', auth, wrap(async (req, res) => res.json(await Quiz.findOne({ _id: req.params.id, creatorId: req.userId }))));
r.put('/quizzes/:id', auth, wrap(async (req, res) => res.json(await Quiz.findOneAndUpdate({ _id: req.params.id, creatorId: req.userId }, validQuiz(req.body), { new: true }))));
r.delete('/quizzes/:id', auth, wrap(async (req, res) => {
  const quiz = await Quiz.findOneAndDelete({ _id: req.params.id, creatorId: req.userId });
  if (quiz) { // also remove its sessions and participants
    const ids = (await Session.find({ quizId: quiz._id }).select('_id')).map(s => s._id);
    await Participant.deleteMany({ sessionId: { $in: ids } });
    await Session.deleteMany({ quizId: quiz._id });
  }
  res.json({ ok: true });
}));

export default r;