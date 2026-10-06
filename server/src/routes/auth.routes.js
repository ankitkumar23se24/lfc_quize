import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { sign, wrap } from '../middleware/auth.js';
import { createWithUid } from '../services/uid.service.js';
const r = Router();
r.post('/auth/register', wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 6) return res.status(400).json({ error: 'Email and a 6+ character password are required.' });
  if (await User.findOne({ email })) return res.status(409).json({ error: 'Email already registered.' });
  const u = await createWithUid(User, { email, passwordHash: await bcrypt.hash(password, 10) }); res.json({ token: sign(u) });
}));
r.post('/auth/login', wrap(async (req, res) => {
  const u = await User.findOne({ email: req.body.email });
  if (!u || !await bcrypt.compare(req.body.password || '', u.passwordHash)) return res.status(401).json({ error: 'Wrong email or password.' });
  res.json({ token: sign(u) });
}));


export default r;
