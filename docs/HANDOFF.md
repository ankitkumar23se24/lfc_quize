# QuizLive — project context and handoff

## Structure
server/src: config/ (env), middleware/ (JWT auth, async wrapper), models/ (User, Quiz, Session, Participant), routes/ (auth, quiz+demo, session+results),
services/ (scoring, session/state/results), sockets/ (all Socket.IO events), app.js (express), server.js (http + io + mongo).
client/src: api/ (fetch + socket base), hooks/ (useLive, useCountdown), components/ (ui, ThemeToggle), pages/ (Landing, Join, Play, HostLogin, Dashboard, QuizEditor, Preview, Live, Results).

## Built
- Host auth (register/login JWT) + one-click guest demo with 5-question quiz
- Quiz CRUD, editor (add/edit/delete/reorder questions, 4 options, correct answer, time limit 5-60s, points, image URLs), preview page
- Live session: unique 6-char room code, waiting room with live participant list + connection status
- State machine WAITING_ROOM -> QUESTION_ACTIVE -> QUESTION_ENDED -> LEADERBOARD -> ... -> QUIZ_COMPLETED, server-authoritative
- Server-synced timer (endsAt + serverNow offset) plus per-second `timer_update` broadcast; auto-end on timeout or when all connected players answered
- Atomic duplicate-answer prevention, server-side scoring (configurable in services/scoring.service.js), no correct answer sent before question ends
- Rate-limited submits, nickname sanitising + uniqueness, host-only controls verified by session.hostId
- Reconnect for players (localStorage playerId) and host (host_join) via `quiz_state_sync`
- Leaderboard with rank-change animation, per-question gained points; participant final stats; host results dashboard
- Dashboard: my quizzes, recent quizzes/sessions, resume or view results; dark/light toggle

- Public unique IDs `2X/XXX/XXX` for every participant and host user (services/uid.service.js, unique index + retry); shown to the host on leaderboard/waiting room and to the player on their own screen
- Host can remove a player (soft delete: removed flag + reason) live via `remove_player` socket event or later via DELETE /api/results/:sessionId/players/:playerId; removed players vanish from leaderboard/results/counts, are kicked, and cannot rejoin

## Still to build (in priority order)
1. "Previous" host button (needs maxPlayed field so replay doesn't re-open scoring)
2. Image file upload (currently URLs only) + quiz cover display on dashboard
3. Option: allow answer changes (config flag on Session + server logic)
4. Host-disconnected banner for players; participant_left toast; restore a removed player
5. Socket.IO room-membership checks on every event beyond role flags; helmet + express-rate-limit on REST
6. Controllers layer (routes currently contain handlers); input validation (zod/joi); unit tests for scoring and state machine
7. Confetti / podium on final screen; sound effects; accessibility pass
8. Production: Dockerfile, env docs, Redis adapter for multi-instance Socket.IO and timers
