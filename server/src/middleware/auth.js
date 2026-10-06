import jwt from 'jsonwebtoken';
export const sign = u => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
export const auth = (req, res, next) => { try { req.userId = jwt.verify((req.headers.authorization || '').slice(7), process.env.JWT_SECRET).id; next(); } catch { res.status(401).json({ error: 'Please sign in.' }); } };
export const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ error: 'Server error' }); });
