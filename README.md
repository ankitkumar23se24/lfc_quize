# QuizLive
Real-time multiplayer quiz platform (React + Vite + Tailwind, Express, Socket.IO, MongoDB).

## Run
```
cd server && copy .env.example .env   (Mac/Linux: cp)  -> set JWT_SECRET, MONGO_URI
npm install && npm run dev
cd ../client && npm install && npm run dev
```
Open http://localhost:5173, click Try demo, start a live quiz, join from other tabs at /join.
See docs/HANDOFF.md for architecture and the remaining work.
