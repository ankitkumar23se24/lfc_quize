import mongoose from 'mongoose';
const { Schema, model } = mongoose;
// `uid` is the public unique ID shown to people (format 2X/XXX/XXX). Sparse so older records without one still load.
export const User = model('User', new Schema({ email: { type: String, unique: true }, passwordHash: String, uid: { type: String, unique: true, sparse: true } }));
const Question = new Schema({ questionText: String, options: [String], correctAnswer: Number, image: String, timeLimit: { type: Number, default: 15 }, points: { type: Number, default: 1000 } });
export const Quiz = model('Quiz', new Schema({ title: String, description: String, category: String, image: String, creatorId: Schema.Types.ObjectId, questions: [Question] }, { timestamps: true }));
export const Session = model('Session', new Schema({
  roomCode: { type: String, unique: true }, quizId: Schema.Types.ObjectId, hostId: Schema.Types.ObjectId,
  currentQuestion: { type: Number, default: -1 }, state: { type: String, default: 'WAITING_ROOM' },
  questionStartedAt: Date, questionEndsAt: Date, startedAt: Date,
}, { timestamps: true }));
export const Participant = model('Participant', new Schema({
  uid: { type: String, unique: true, sparse: true },
  sessionId: Schema.Types.ObjectId, nickname: String, rollNo: String, score: { type: Number, default: 0 }, connected: { type: Boolean, default: true },
  answers: [{ questionId: String, index: Number, option: Number, correct: Boolean, points: Number, ms: Number }],
  joinedAt: { type: Date, default: Date.now },
  // Soft delete: a removed player disappears from leaderboard/results/counts and cannot rejoin, but the record is kept as an audit trail.
  removed: { type: Boolean, default: false }, removedAt: Date, removedReason: String,
}));