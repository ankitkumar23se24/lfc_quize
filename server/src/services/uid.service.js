import { randomInt } from 'node:crypto';

// Unique public ID, format "2X/XXX/XXX": fixed leading "2", then 7 random characters grouped 1/3/3.
// Ambiguous characters (0, O, 1, I, L) are left out so IDs are easy to read out loud.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PREFIX = '2';
const pick = n => Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
export const generateUid = () => `${PREFIX}${pick(1)}/${pick(3)}/${pick(3)}`;
export const UID_PATTERN = /^2[A-Z0-9]\/[A-Z0-9]{3}\/[A-Z0-9]{3}$/;

// Creates a document, retrying with a fresh uid if (very unlikely) the unique index rejects it.
export async function createWithUid(Model, doc, tries = 8) {
  for (let i = 0; i < tries; i++) {
    try { return await Model.create({ ...doc, uid: generateUid() }); }
    catch (e) { if (!(e.code === 11000 && e.keyPattern?.uid)) throw e; }
  }
  throw new Error('Could not allocate a unique ID');
}
