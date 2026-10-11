# GameHub

> A full-stack mini-game platform with analytics, quests, ranked seasons, social gaming, achievements, challenges, and admin tools.

## Overview

GameHub is a modern, premium web-based mini-game platform that allows users to play various games, track their scores, unlock achievements, compete on leaderboards, and complete daily challenges.

The platform includes an integrated Admin Dashboard for managing users, games, challenges, and scores. Analytics, quest progression, ranked seasons, Social features, and installable PWA support are implemented in the current codebase.

**Development Status:** Analytics, Quest, Ranked, Social, and PWA are present in the current working tree. The QA pass added authentication/authorization and CORS tests, a frontend QA command, route-level code splitting, keyboard focus and reduced-motion defaults, and deployment/API documentation. Current automated results and limitations are recorded under [Verification](#verification). A production database, full browser-based accessibility review, and install checks on target devices were not part of this pass.

## Features

### 1. Authentication and User Management

* JWT-based user registration and login.
* Password hashing using bcrypt.
* User profile and statistics.
* Profile information updates.
* Protected routes and role-based access control.

### 2. Premium UI/UX

* Modern glassmorphism-inspired design.
* Responsive layouts for desktop, tablet, and mobile.
* Interactive dashboard and reusable UI components.
* Consistent typography, spacing, and visual design.
* Mobile-friendly navigation and game controls.

### 3. Mini-Games

GameHub currently documents three mini-games:

* **Memory Match:** A memory game where players match pairs of cards.
* **Number Rush:** A puzzle game that challenges players to complete number-based tasks.
* **Reaction Test:** A reflex game that measures players' reaction speed.

Each game can contribute to player statistics and leaderboard rankings according to its scoring rules.

### 4. Leaderboards

* Global leaderboard based on player scores.
* Per-game leaderboards.
* Ranking tie-breakers.
* Score tracking and personal best records where supported.

### 5. Achievements and Challenges

* Achievement badges for reaching milestones.
* Daily and weekly challenges.
* Challenge progress tracking.
* Bonus points for completing eligible challenges.

### 6. Admin Dashboard

* User management.
* Game management.
* Challenge management.
* Score monitoring.
* Administrative CRUD operations.
* Protected administrative endpoints.

### 7. Security

* Password hashing with bcrypt.
* JWT-based authentication.
* API rate limiting.
* Parameterized SQL queries to reduce SQL injection risks.
* Protected API routes and administrative permissions.
* Server-side validation for sensitive operations.

### 8. Player and Admin Analytics

* Player session totals, per-game best and average scores, daily trends, and up to 50 recent sessions.
* Admin user/session summaries, 7/30-day active-user counts, filtered game popularity and activity trends, and lifetime challenge participation/completion statistics.
* Raw scores are summarized per game because score scales differ. In all-game trends the chart uses sessions/players; score metrics are available after selecting one game.
* Active users are distinct users with at least one completed game session in the previous 7 or 30 days (UTC).
* Admin challenge filters select matching games and overlapping challenge schedules; participation/completion counts remain lifetime because `challenge_progress` has no participation timestamp.
* Player endpoints are scoped to the authenticated user; admin analytics require the admin role.

### 9. Quests and Progression

* Daily, weekly, and special-event quests with session-based progress.
* XP, levels, XP transaction history, and quest completion history.
* Backend reward claiming and unlockable badges, titles, and profile frames.

Quest progress is calculated by the backend in the same transaction that records a completed score and game session. The processor reads score, game, and duration from the stored session and requires a matching score row. Score submissions require an integer score within the game's configured bounds and a valid duration. The score endpoint's submission key prevents a retried request from recording a second session.

Each accepted session grants base XP using `20 + min(30, floor(score / 100))`. Quest rewards are granted only after the server sees the user's quest instance as completed; claiming locks that instance, marks it claimed, writes XP to `xp_transactions`, and applies bonus points or cosmetics in the same database transaction. The XP audit's `source_id` points to the session for session XP and the `user_quests` instance for a quest reward. Duplicate cosmetic unlocks keep their original unlock timestamp.

Daily quests reset at 00:00 UTC. Weekly quests use ISO weeks, Monday 00:00 UTC through the following Monday. The UI receives these reset boundaries from the backend. Special-event quests use their configured UTC start/end timestamps and retain one progress/claim history entry per event. Level 1 requires 200 XP; each later level requires `100 + level * 100` XP to advance.

Quests have separate persistence from achievements and challenges because the existing systems represent permanent unlocks and score-based challenge completion, while quests need daily/weekly periods, automatic session progress, claim state, and XP rewards. XP is a progression metric; bonus score is separate from gameplay score. Score range checks reject invalid submissions but do not prove that a modified client genuinely played the game.

### 10. Ranked Seasons

* Bronze, Silver, Gold, Platinum, and Diamond tiers with season rating points (RP).
* Season leaderboards, player rank profiles, ranked session history, and season rewards.
* The Ranked page displays eligible games, score and duration limits, score bands, tier thresholds, RP changes, season dates, and reward status.
* Ranked calculations run in the backend after the submitted score and matching stored game session have been verified.
* Rank histories and leaderboards remain scoped to their season; expired season records are retained.

### 11. Social Gaming

* Search active players by username and view authenticated public profiles.
* Send, accept, reject, cancel, and remove friendships; an opposite pending request auto-accepts, while duplicate same-direction requests return a conflict.
* Block/unblock players. A block hides both profiles from one another's Social surfaces and removes any pending or accepted relationship.
* View a paginated feed of personal bests and newly unlocked achievements from yourself and accepted friends.
* Compare yourself and your friends on the existing cumulative-points leaderboard, separate from Ranked RP.
* View paginated in-app notifications, unread counts, and mark one or all as read.

Public profile responses are a server-side allowlist: username, avatar, aggregate score/progression, equipped public cosmetics, recent achievements, and relationship state. Email, role, account state, password data, and private session history are excluded. Requester identity and notification ownership come from the authenticated backend user. Score-derived activity and its friend notifications are saved in the same transaction as the score and achievement updates.

### 12. Progressive Web App

* The web app manifest and 192/512 pixel PNG icons provide the GameHub install identity.
* `vite-plugin-pwa` generates the service worker and precaches versioned application bundles, local game chunks, styles, and public icons. Production builds use automatic service worker updates and clean obsolete Workbox caches.
* The service worker does not runtime-cache API responses. Authenticated/private data, scores, JWTs, and credentials are not added to its cache.
* When online, the app shows a network status. When offline, API-backed screens are replaced with an offline page; the home page remains available.
* Reaction Test, Number Rush, and Memory Match can be opened as offline practice after their application assets have been downloaded during an earlier online visit. Practice scores are not stored or synchronized. Login, score submission, profiles, leaderboards, Quest, Ranked, and Social require an internet connection.
* Interrupted online score submissions can be retried while connected using the same submission key; there is no offline score queue.

#### PWA cache and update behavior

Only files emitted in the frontend production build that match the Workbox static asset list are precached. Requests to `/api/...` bypass navigation fallback and are never cached. The app does not cache responses based on authentication headers or user identity. Users need to open the app online once to download the current game chunks before offline practice can work.

After a deployment, the generated service worker checks for the new build and activates it automatically. Workbox removes obsolete precache versions. The app may reload when the new worker takes control. Serve the frontend over HTTPS in production (localhost is a secure context for local checks), and configure the host's SPA fallback to serve `index.html` for frontend routes while preserving `/api` routing to Express.

To verify a production build locally, run `npm run build` and `npm run preview` from `frontend`, open the preview online once, then test an offline route in the same browser profile. The Vite development server does not enable the production service worker.

The automated PWA build checks run after building with `npm run test:pwa` from `frontend`. They validate the generated manifest and PNG dimensions, the static-only precache and API exclusion, update cleanup, offline route decisions, and rejection of score submission while offline.

## Using Friends and Chess

GameHub keeps each login in the current browser tab. To test two players on one local URL, open the same address in two separate tabs (or browser profiles), sign in to a different account in each, and keep both tabs open. This stops one player's login from replacing the other player's session. A single tab can only be signed in as one account at a time.

1. Create an account or sign in, then open **Friends** from the player navigation.
2. Search by username and choose **Add friend**. Use the incoming and outgoing request tabs to accept, reject, or cancel requests; accepted players appear in the friends list.
3. Open **Chess**, choose an accepted friend, and send an invitation. The invitee can accept it from Chess or join using the room code shown in the invitation. Rooms are private to the host and invited friend; waiting invitations expire after 15 minutes.
4. Select a piece and destination square to make a move. The server validates legal moves and synchronizes the position. The active match can be reopened after reconnecting. The match view also supports resignation, draw offers, and rematches.

After changing a profile, the new username and avatar appear in the profile page, top bar, and navigation without requiring another login.

## Installing GameHub

Open GameHub online in a supported browser and use the download icon in the header. If the browser does not show a native install prompt, follow the on-screen instructions or open the browser menu and choose **Install GameHub** / **Add to Home Screen**. On iOS Safari, use **Share → Add to Home Screen**. Offline practice is available only after the app assets have been loaded once online; friends, chess, account data, and score submissions require a connection.

## Planned Enhancements

The following enhancements are proposed to expand GameHub beyond its existing functionality.

### 1. Additional Improvements

**More Mini-Games**

* Expand the game library with additional puzzle, reflex, and memory games.
* Define clear scoring rules for each game.
* Ensure new games integrate with existing score and achievement systems.

**Localization**

* Support Indonesian and English.
* Centralize UI text for easier translation.
* Provide consistent date and number formatting.

**Accessibility**

* Keyboard navigation.
* Accessible labels and controls.
* Sufficient color contrast.
* Reduced-motion support.
* Clear feedback for errors and game results.

**Quality and Performance**

* Automated tests.
* API validation improvements.
* Database query optimization.
* Error monitoring.
* Deployment documentation.
* Performance and accessibility reviews.

## Tech Stack

| Component           | Technology                          |
| ------------------- | ----------------------------------- |
| Frontend            | React 19                            |
| Build Tool          | Vite                                |
| Styling             | Tailwind CSS v4                     |
| Routing             | React Router DOM                    |
| Icons               | Lucide React                        |
| HTTP Client         | Axios                               |
| Backend             | Node.js                             |
| API Framework       | Express.js                          |
| Database            | MySQL                               |
| Database Driver     | mysql2                              |
| Authentication      | JSON Web Tokens (JWT)               |
| Password Hashing    | bcrypt                              |
| Rate Limiting       | express-rate-limit                  |
| PWA Support | `vite-plugin-pwa`, Web App Manifest, and generated Workbox Service Worker |

The installed package versions should be verified against the project's `package.json` files and lockfiles.

## Architecture

GameHub uses a client-server architecture with a React single-page application communicating with an Express REST API.

```text
+--------------------------------------+
|          React + Vite Frontend       |
|                                      |
| Pages, Components, Hooks, API Client |
+-------------------+------------------+
                    |
                    | HTTP / REST API
                    v
+--------------------------------------+
|           Express.js Backend         |
|                                      |
| Routes, Middleware, Controllers      |
| Services, Validation, Business Logic |
+-------------------+------------------+
                    |
                    | mysql2
                    v
+--------------------------------------+
|               MySQL                  |
|                                      |
| Users, Games, Scores, Sessions       |
| Achievements, Challenges, Progress   |
+--------------------------------------+
```

The architecture separates user interface, business logic, API routing, and database operations.

Analytics, quest progression, and Ranked follow the same separation of concerns. Security-sensitive calculations, score validation, ranking changes, and reward processing are handled by backend services.

## Database

### Core Tables

* `users`
* `games`
* `scores`
* `game_sessions`
* `achievements`
* `user_achievements`
* `challenges`
* `challenge_progress`

### Implemented Quest and Ranked Tables

Quest and progression migration (`backend/migrate_phase3_quests.js`) creates or updates:

* `quests`
* `user_quests`
* `quest_session_logs`
* `xp_transactions`
* `user_cosmetics`

Ranked migration (`backend/migrate_phase4_ranked.js`) creates or updates:

* `ranked_seasons`
* `user_season_ranks`
* `ranked_matches`
* `season_rewards`

Social migration (`backend/migrate_phase5_social.js`) creates:

* `friendships` with one unique row per unordered user pair.
* `user_blocks` for directional blocks.
* `activities` for server-recorded personal bests and achievement unlocks.
* `notifications` for friend requests, acceptances, and friend activity.

The Quest migration also adds XP, level, and selected-cosmetic fields to `users`. The Ranked migration adds the `RANKED_REWARD` XP source type without replacing existing schedules or reward rows. Analytics currently aggregates existing score, session, user, and challenge data; it does not add a separate analytics table.

### Social, Chess, and Future Persistence

| Feature | Tables |
| --- | --- |
| Social | `friendships`, `user_blocks`, `activities`, `notifications` |
| Chess | `chess_rooms`, `chess_invitations`, `chess_moves` (added by `backend/migrate_chess.js`) |
| PWA | No additional database persistence; offline games are practice-only and do not queue scores |

Before adding new tables, review current relationships, foreign keys, indexes, naming conventions, and migration practices to avoid duplicating existing functionality.

For an existing database, apply the additive migrations in order after importing `database/schema.sql` and configuring `backend/.env`:

```bash
node backend/migrate_phase1_stability.js
node backend/migrate_phase3_quests.js
node backend/migrate_phase4_ranked.js
node backend/migrate_phase5_social.js
node backend/migrate_chess.js
```

The Phase 1 migration adds the user active flag and unique score-submission key. Quest, Ranked, and Social migrations add their feature schema; the Chess migration adds room, invitation, and move-history tables without modifying existing user or score rows. Back up the database and rehearse migrations on a staging copy before applying them in production. `backend/migrate_phase9.js` is an optional achievement seed script, not a schema migration; it inserts the Champion and Daily Player achievements if they are not already present.

## API Documentation

Base URL: `/api`

### Core Endpoints

All paths below are relative to the `/api` base URL. All routes require a bearer token except `GET /health`, `POST /auth/register`, and `POST /auth/login`.

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/health` | API/database health check |
| POST | `/auth/register` | Register a user |
| POST | `/auth/login` | Authenticate and issue a JWT |
| GET | `/auth/me` | Get the authenticated user |
| GET | `/dashboard` | Get the authenticated user's dashboard |
| GET / PUT | `/profile` | Read or update the authenticated user's profile |
| GET | `/history` | Read the authenticated user's game history |
| GET | `/games` | List active games |
| GET | `/games/:slug` | Get an active game by slug |
| POST | `/scores` | Submit a score and process session-based progression |
| GET | `/leaderboard` | Read the global score leaderboard |
| GET | `/leaderboard/:gameId` | Read a game's score leaderboard |
| GET | `/achievements` | List achievements |
| GET | `/achievements/me` | List the caller's unlocked achievements |
| POST | `/achievements/check` | Check and award eligible achievements for the caller |
| GET | `/challenges` | List challenges and caller progress |
| GET | `/challenges/today` | List today's challenges and caller progress |
| POST | `/challenges/:id/complete` | Request completion of a challenge |

### Analytics Endpoints

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/analytics/me/summary` | Authenticated player, own data |
| GET | `/analytics/me/trend?game=<slug>&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD` | Authenticated player; filtered daily trend and latest 50 matching sessions |
| GET | `/analytics/admin/summary` | Admin |
| GET | `/analytics/admin/games?game=<slug>&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD` | Admin; filtered by completed sessions |
| GET | `/analytics/admin/challenges?game=<slug>&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD` | Admin; selects challenges by game/schedule, participation counts are lifetime |
| GET | `/analytics/admin/trend?game=<slug>&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD` | Admin; filtered daily trend |

### Quest Endpoints

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/quests` | Authenticated player |
| POST | `/quests/:userQuestId/claim` | Authenticated player; own quest is checked by service |
| GET | `/quests/history` | Authenticated player |
| GET | `/quests/xp-logs` | Authenticated player |
| GET | `/quests/cosmetics` | Authenticated player |
| POST | `/quests/cosmetics/equip` | Authenticated player |

### Ranked Endpoints

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/ranked/profile` | Authenticated player |
| GET | `/ranked/leaderboard` | Authenticated player |
| GET | `/ranked/seasons` | Authenticated player; season list and backend-generated rating rules |
| POST | `/ranked/seasons/:seasonId/claim-rewards` | Authenticated player; claim is scoped to requester |

Verify response formats and any additional endpoints against the source before treating this list as exhaustive.

### Administrative Endpoints

All routes below require an authenticated `ADMIN` user.

| Method | Endpoint |
| --- | --- |
| GET | `/admin/stats` |
| GET | `/admin/users` |
| GET | `/admin/users/:id` |
| PUT | `/admin/users/:id/role` |
| PUT | `/admin/users/:id/status` |
| DELETE | `/admin/users/:id` |
| GET / POST | `/admin/games` |
| PUT / DELETE | `/admin/games/:id` |
| GET / POST | `/admin/challenges` |
| PUT / DELETE | `/admin/challenges/:id` |
| GET | `/admin/scores` |
| DELETE | `/admin/scores/:id` |

### Social Endpoints

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/social/users?search=<username>&page=1&limit=20` | Authenticated username search; excludes self and blocked accounts |
| GET | `/social/users/:username` | Authenticated public profile; whitelisted profile, aggregate, and achievement fields only |
| POST | `/social/friends/requests` | Authenticated; body `{ "username": "target" }` |
| GET | `/social/friends/requests?box=incoming|sent&page=1&limit=20` | Authenticated; own pending requests |
| PATCH | `/social/friends/requests/:id` | Authenticated; body `{ "action": "ACCEPT|REJECT|CANCEL" }`, requester/recipient rules enforced |
| GET | `/social/friends?page=1&limit=20` | Authenticated; own accepted friends |
| DELETE | `/social/friends/:id` | Authenticated; only a participant can remove an accepted friendship |
| GET | `/social/blocks?page=1&limit=20` | Authenticated; own block list |
| POST | `/social/blocks` | Authenticated; body `{ "username": "target" }`; removes an existing relationship |
| DELETE | `/social/blocks/:username` | Authenticated; removes own block |
| GET | `/social/feed?page=1&limit=20` | Authenticated; own and friends' personal-best/achievement activities |
| GET | `/social/leaderboard?page=1&limit=20` | Authenticated; self and friends, ordered by cumulative `total_score`, separate from Ranked RP |
| GET | `/social/notifications?page=1&limit=20` | Authenticated; own notifications and unread count |
| PATCH | `/social/notifications/:id/read` | Authenticated; only notification recipient |
| PATCH | `/social/notifications/read-all` | Authenticated; marks only the caller's unread notifications |

Social behavior: duplicate pending requests return `409`; sending a request while an opposite-direction request is pending accepts that request automatically. Only the recipient can accept/reject, and only the requester can cancel. Blocking is directional in storage but suppresses discovery, profile visibility, feed, and new interactions in both directions; blocking also removes the relationship. Public profiles expose username, avatar, aggregate score/progression, equipped public cosmetics, and recent achievements, but never email, role, account state, or private session history. Personal-best and achievement activities are created by the score backend in the same transaction as score processing. The friends leaderboard reuses cumulative GameHub points and is not a Ranked RP comparison.

### Chess Endpoints

All Chess REST endpoints require authentication. Paths below are relative to `/api`.

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/chess/invitations` | List the caller's invitations |
| POST | `/chess/invitations/:id/respond` | Accept or decline an invitation |
| GET | `/chess/rooms/active` | Find the caller's active or waiting room |
| POST | `/chess/rooms/join` | Join a room using its code |
| POST | `/chess/rooms` | Create a room and invite an accepted friend |
| POST | `/chess/rooms/:roomCode/actions` | Resign or offer/accept a draw |
| POST | `/chess/rooms/:roomCode/rematch` | Request a rematch |
| GET | `/chess/rooms/:roomCode` | Read a room the caller is authorized to access |

Live play uses authenticated Socket.IO events `chess:join`, `chess:move`, and `chess:action`. The server checks room membership, turn, and chess legality. The Socket.IO server shares the backend origin; real-time chess requires an online connection.

## Security

The backend applies these security measures:

* Password hashing with bcrypt.
* JWT-based authentication.
* `express-rate-limit` applies a global API limit of 100 requests per 15 minutes, plus per-IP limits for login (10/15 minutes), registration (5/hour), user search (30/minute), and friend requests (20/hour). The in-memory store is per server process; multi-instance deployments need a shared store and verified proxy IP configuration.
* Parameterized SQL queries to reduce SQL injection risks.
* Protected administrative routes.
* A configurable, exact-origin CORS allowlist (`CORS_ORIGINS`), a 1 MB JSON body limit, generic 500 responses, and disabled Express version headers.

Additional security practices to maintain and improve:

* Validate and normalize all incoming data on the server.
* Enforce authorization for private resources and administrative operations.
* Store JWT secrets and database credentials in environment variables.
* Never commit real `.env` files or secrets.
* Configure appropriate token expiration and authentication error handling.
* Apply pagination and request limits to feeds, leaderboards, and analytics.
* Validate score submissions and game session ownership on the backend. Current score range and duration checks do not prove that client-reported gameplay was honestly completed.
* Prevent duplicate score submissions, XP grants, and reward claims. Score submissions use a per-attempt idempotency key and require the Phase 1 stability migration. This prevents the same key from receiving rewards twice, but does not prove the client played the game; a modified client can submit a plausible score with a new key.
* Protect private profile information.
* Use HTTPS in production.
* Consider audit logs for sensitive administrative operations.

Security measures should be verified through testing and configuration review rather than assumed to be effective simply because they are documented.

## Installation

### Prerequisites

* Node.js 20.19+ or 22.12+ and npm (required by the installed Vite version).
* MySQL Server.
* Git.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd GameHub
```

Replace `<repository-url>` with the actual repository URL.

### 2. Set Up the Database

The schema creates the `gamehub` database and core tables. From the repository root, import it with a MySQL account that can create the database:

```bash
mysql -u <database-user> -p < database/schema.sql
```

The schema includes the core, Quest, and Social tables. Run the additive Phase 1, 3, 4, and 5 migrations in order to add missing stability fields and Ranked/feature schema. Use the same database credentials that the backend will use.

### 3. Install Backend Dependencies

```bash
cd backend
npm ci
```

Copy `backend/.env.example` to `backend/.env` and set the database credentials and a randomly generated `JWT_SECRET` with at least 32 random bytes. Keep this file private and out of version control.

### 4. Install Frontend Dependencies

Open a second terminal from the project root:

```bash
cd frontend
npm ci
```

Copy `frontend/.env.example` to `frontend/.env`. The default API URL is the local Express server.

### Apply database migrations

From the repository root, after configuring `backend/.env`, run:

```bash
node backend/migrate_phase1_stability.js
node backend/migrate_phase3_quests.js
node backend/migrate_phase4_ranked.js
node backend/migrate_phase5_social.js
```

These scripts connect to the database named in `backend/.env`. The Chess migration additively creates room, invitation, and move-history tables with `CREATE TABLE IF NOT EXISTS`; it does not rewrite existing user or score rows. Back up production and apply migrations to staging first. To add the optional Champion and Daily Player achievements, run `node backend/migrate_phase9.js` after the schema and migrations are applied.

## Environment Variables

### Backend: `backend/.env`

```env
PORT=5000
CORS_ORIGINS=http://localhost:5173

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=gamehub

JWT_SECRET=replace_with_a_long_random_secret
```

Use a strong, randomly generated JWT secret. Never commit real credentials or production secrets to the repository.

### Frontend: `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Set `CORS_ORIGINS` to comma-separated frontend origins without paths, for example `https://gamehub.example,https://admin.example`. The backend defaults to `http://localhost:5173` when it is unset. `VITE_API_BASE_URL` is embedded into the frontend at build time. Vite exposes variables prefixed with `VITE_` to client-side code; never put database credentials or the JWT signing secret there.

## Running the Project

### Start the Backend

In Terminal 1:

```bash
cd backend
npm run dev
```

### Start the Frontend

In Terminal 2:

```bash
cd frontend
npm run dev
```

Open the URL printed by Vite, typically:

`http://localhost:5173`

The frontend dev server proxies relative `/api` requests to `http://localhost:5000` as configured in `frontend/vite.config.js`. The sample `frontend/.env.example` uses the direct local API URL; set `VITE_API_BASE_URL=/api` to use the Vite proxy instead.

## Testing and QA

Run backend unit and request-validation tests:

```bash
cd backend
npm test
```

Run frontend lint, production build, and tests (including the production PWA artifact checks):

```bash
cd frontend
npm run qa
```

`npm run test:pwa` runs the PWA-specific tests after `npm run build`. The Social database/API integration test is opt-in with `GAMEHUB_SOCIAL_INTEGRATION=1`; use only a dedicated disposable test database, never a production database. Browser installation, keyboard/screen-reader checks, responsive visual review, and large-dataset performance checks require separate manual or environment-specific verification.

## Production deployment

The repository includes a Vercel configuration at [`vercel.json`](vercel.json). It builds the Vite app from `frontend/`, routes `/api/*` to the Express function, and routes `/socket.io/*` to the HTTP server that hosts the Chess Socket.IO endpoint. The API and web app use the same origin, so `VITE_API_BASE_URL` can stay `/api` (the frontend already uses this default).

### Deploy to Vercel

1. Push this repository to a Git provider supported by Vercel, then import that repository in the Vercel dashboard. Set the project Root Directory to the repository root (`.`); keep the build and output settings from `vercel.json`.
2. Provision a MySQL database reachable over the public network from Vercel. Do not use `localhost` or a development database. Confirm the provider's connection and TLS requirements before adding credentials.
3. Add these server-only variables in Vercel Project Settings → Environment Variables for Preview and Production as appropriate:

   | Variable | Value |
   | --- | --- |
   | `DB_HOST` | MySQL provider hostname |
   | `DB_PORT` | MySQL provider port, usually `3306` |
   | `DB_USER` | Restricted application database user |
   | `DB_PASSWORD` | Database password |
   | `DB_NAME` | GameHub database name |
   | `JWT_SECRET` | Strong, randomly generated secret; keep the same value across deployments |
   | `CORS_ORIGINS` | Optional comma-separated custom HTTPS origins; Vercel deployment URLs are added automatically |
   | `VITE_API_BASE_URL` | Optional; use `/api` for this single-domain deployment |

   Never add database credentials or `JWT_SECRET` as `VITE_*` variables. Vercel injects `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL`; the backend adds those origins to its CORS allowlist. Add any custom domain to `CORS_ORIGINS`.
4. Apply the SQL schema and migrations to a staging database first. Back up production and apply migrations manually from a trusted environment; this project does not run migrations during deployment. Do not run migration scripts against production until their impact and backup have been checked.
5. Deploy a Preview, set its environment variables, then verify `/api/health`, account registration/login, profile, score submission, leaderboards, and PWA routes. After checks pass, configure the Production variables and promote/deploy the production branch.
6. After attaching a custom domain, add its exact `https://` origin to `CORS_ORIGINS`, redeploy, and verify the same flows over HTTPS.

### Vercel and real-time Chess limitation

Vercel Functions support WebSockets in public beta. A Socket.IO connection stays on one function instance only for that invocation's maximum duration; two players may connect to different instances. This code currently uses Socket.IO's in-memory room adapter, so cross-instance Chess event delivery is not guaranteed. Use a shared Socket.IO adapter such as Redis before relying on multiplayer Chess at production scale, and test reconnection and two separate accounts after deployment. REST API, database persistence, and frontend deployment do not depend on that adapter. See [Vercel's WebSocket announcement](https://vercel.com/changelog/websocket-support-is-now-in-public-beta) and [connection limits/state guidance](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections).

The frontend service worker caches static build assets only. API responses and authenticated data are not cached. A production PWA must be served over HTTPS (except localhost during development).

## Admin Account

For local development and testing, register a normal user and grant the account the admin role directly in the database:

```sql
UPDATE users
SET role = 'ADMIN'
WHERE username = 'your_username';
```

Replace `your_username` with the intended account's username and verify that the correct row was updated.

This approach is intended for local development only. Production admin provisioning should use an authorized process, and every admin endpoint must enforce role checks on the backend.

## Project Structure

The following structure reflects the project's documented organization. Actual filenames may vary.

```text
GameHub/
├── backend/
│   ├── config/          # Database and environment configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Authentication, authorization, errors, rate limits
│   ├── routes/          # REST API routes
│   ├── services/        # Business logic and database queries
│   ├── app.js
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── games/       # Mini-game implementations
│   │   ├── hooks/       # Custom React hooks, including useAuth
│   │   ├── layouts/     # User and admin layouts
│   │   ├── pages/       # Application pages
│   │   ├── services/    # API calls using Axios
│   │   └── index.css
│   └── ...
└── README.md
```

As the application grows, organize new features consistently with the existing architecture. Add new folders only when they provide a clear separation of responsibilities.

## Verification

### QA run on 2026-10-11

* Backend `npm test`: 41 passed, 0 failed, 1 skipped (42 tests total). The skipped test is the opt-in Social API integration test; no dedicated disposable database was configured for that destructive fixture workflow.
* Frontend `npm run qa`: completed successfully after the Chess friends-response fix. Oxlint exited 0 with 24 existing warnings; the production build completed; all 16 frontend tests passed.
* The largest initial JavaScript bundle is 274.65 KB minified (83.20 KB gzip). The production build precaches 57 static assets (828.79 KiB) for the PWA.
* Automated checks cover authentication and authorization, input validation, Chess rules and Socket.IO permissions/rate limiting, keyboard focus and reduced-motion defaults, Number Rush score bounds, and generated PWA assets/offline rules.
* `node --check` passed for all 81 backend JavaScript files. A short backend startup check reached the listening callback after connecting to MySQL. `git diff --check` exited 0; Git emitted line-ending conversion notices only. The additive Chess migration ran against the configured local MySQL database, and a read-only metadata query confirmed the core users table and all three Chess tables.

This is not a full release sign-off. Database-backed end-to-end flows for registration/login, profile updates, score submission, leaderboards, achievements/challenges, Analytics, Quest/XP, Ranked, and Social were not rerun in this pass. The Social database integration test was skipped. Chess was verified with unit and two-client Socket.IO tests using test identities, but not with two real browser sessions. Rate limits currently use per-process memory storage keyed by IP; multi-instance shared storage and client-IP handling behind the production proxy still need configuration and verification. Installation on a physical device, screen-reader and keyboard walkthroughs, contrast measurement, responsive visual review, and large-dataset query profiling remain unverified. Oxlint warnings remain and need review; an exit code of zero does not mean the lint output is warning-free.

### Earlier feature-specific local checks

The feature checks below were recorded during earlier local reviews; they were not rerun as part of the QA run above. Use a dedicated disposable test database before opting into any database integration test.

### Core Functionality

* [ ] Registration and login.
* [ ] Protected routes and authorization.
* [ ] Profile retrieval and update validation.
* [ ] Game sessions and score submission.
* [ ] Global and per-game leaderboard ordering.
* [ ] Leaderboard tie-breaker behavior.
* [ ] Achievement unlocking and challenge progress.

### Social Features

* [x] Users cannot send friend requests to themselves; duplicates and opposite-direction requests are handled.
* [x] Only the recipient can accept/reject, only the requester can cancel, and only a friendship participant can remove it.
* [x] Public profiles use a field allowlist; private relationship and notification access is scoped to the authenticated user.
* [x] Search, friend lists/requests, feed, friends leaderboard, blocks, and notifications support pagination.
* [x] Blocking suppresses cross-user discovery and interactions and removes an existing relationship.
* [x] Score retry integration confirms personal-best/achievement feed events are not duplicated.

To run the opt-in Social API integration test from `backend` in PowerShell, set `$env:GAMEHUB_SOCIAL_INTEGRATION='1'` and run `node --test tests/social.integration.test.js`. Only use a dedicated disposable test database; never point this test at production.

### Ranked System

* [x] RP calculation rules are shared by the backend and the authenticated rules response shown on the Ranked page.
* [x] Draw bands include both endpoints; season assignment uses the session timestamp and UTC schedule.
* [x] Concurrent score updates are transactional, with session uniqueness and transient deadlock retries.
* [x] Invalid scores, mismatched sessions, and repeated submission keys do not grant extra RP.
* [x] End-of-season rewards require at least one ranked session and can be claimed only once per player/season.
* [x] The ordinary global and per-game score leaderboards keep their existing score-based ordering.

Ranked sessions are limited to active `reaction-test`, `number-rush`, and `memory-match` games. The score and duration must also satisfy the game's existing score-submission limits. The backend verifies that the supplied score ID, authenticated player, game, score, and duration match the persisted `scores` and `game_sessions` rows before changing RP.

| Game | Valid score | Valid duration | LOSS | DRAW | WIN |
| --- | ---: | ---: | --- | --- | --- |
| Reaction Test | 0–1,000 | 0.1–60 sec | `< 650` | `650–750` | `> 750` |
| Number Rush | 0–2,000 | 3–300 sec | `< 750` | `750–900` | `> 900` |
| Memory Match | 0–3,000 | 5–600 sec | `< 900` | `900–1,100` | `> 1,100` |

Raw scores from different games are never compared. Each score is classified only against its own game's benchmark. A result is a score-band result, not a head-to-head match against another player. The duration is validated and stored in history, but does not change RP.

| Tier | RP range | WIN | DRAW | LOSS |
| --- | ---: | ---: | ---: | ---: |
| Bronze | 0–499 | +35 | +15 | -5 |
| Silver | 500–999 | +30 | +10 | -15 |
| Gold | 1,000–1,499 | +25 | +5 | -20 |
| Platinum | 1,500–1,999 | +22 | 0 | -22 |
| Diamond | 2,000+ | +20 | -5 | -25 |

Winning sessions receive an additional `round((score / game maximum - 0.85) * 60)` RP when normalized score is at least 85%, capped at +9. RP cannot fall below 0. Rank tiers are recalculated from resulting RP. Leaderboard ties resolve by higher current RP, then higher season peak RP, then lower user ID.

Season start/end timestamps are UTC. The score's stored `played_at` decides its season, including submissions at the inclusive start/end boundary; old season rows and match history are not reset. Season definitions and reward tiers are managed in the `ranked_seasons` and `season_rewards` tables; no season-admin screen or automatic schedule generator is present. The profile/history view paginates ten ranked sessions at a time for the selected season. A final reward is selected from the player's highest peak tier, requires at least one match, and grants its XP, bonus score, and cosmetics in one transaction.

### Quest and Rewards

* [x] Progress is derived from stored score/session rows, game eligibility, and backend validation.
* [x] Session processing and quest reward claims are idempotent and transactional.
* [x] Daily UTC and ISO-week UTC reset boundaries are explicit; cross-game progress is scoped to its period.
* [x] The XP ledger matched stored XP for every user in the local database; production data was not available for this check.

### Analytics

* [x] Player/admin aggregations and challenge counts match read-only SQL checks against local data.
* [x] Date/game filters return matching results, including challenge game/schedule filters; malformed and reversed dates are rejected.
* [x] Player analytics use the authenticated user; non-admin access to admin analytics is rejected.
* [x] No-data filters return empty arrays for frontend empty states.
* [ ] Large-dataset performance and visual layout still need a manual review.

### PWA

* [x] Production manifest and app icons load; Workbox generates a service worker and precaches static build assets.
* [x] Automatic service worker updates clean obsolete precache versions; the app guides installation in browsers without a native prompt event.
* [x] Cached offline routes and practice UI load after the preview server stops; the three client-side games offer practice without score submission or synchronization. Device-wide offline indicator and installed-app checks remain platform-specific.
* [x] JWT and authenticated API responses are excluded from the service worker cache; online score validation remains server-side.

## Development Roadmap

This roadmap tracks the implementation already present in the working tree and the checks completed in the current pass. Database-backed integration and device-specific release checks remain open.

* [x] **Phase 1 — Audit and Stabilize:** Fixes for the `users.is_active` schema field, retry-safe score submission, concurrent challenge completion, and ended-season fallback are present. Unit tests pass. Authenticated gameplay and complete integration verification remain.
* [x] **Phase 2 — Analytics:** Player/admin pages, SQL aggregates, game/date filters, authorization, and empty-data responses are implemented and checked against the local database. Visual UI review and large-dataset performance checks remain.
* [x] **Phase 3 — Quest Progression:** Quest, XP, level, reward, history, cosmetics, migration, and frontend code are implemented. Backend session verification, period-scoped game-variety progress, request validation, repeatable partial-column migration, and schema documentation are in place. Four UTC/level unit tests and local score submission, retry, invalid-session, claim, XP-ledger, badge, and cosmetic integration checks pass. Manual visual review remains.
* [x] **Phase 4 — Ranked Seasons:** Ranked profile, per-season leaderboard, match/RP history, tier progress, season rewards, empty state, and backend-generated transparent rules are implemented. Score/session values are verified from database rows; duplicate keys, invalid score/session, inclusive UTC season boundaries, concurrent sessions, historical empty seasons, regular leaderboard preservation, cross-user reward access, and one-time rewards were checked against local MySQL. Fifteen backend tests pass (seven rating-rule, four request-validation, and four Quest tests); the migration ran twice without duplicate seed data. Manual visual review remains, and season scheduling is database-managed rather than exposed through an admin screen.
* [x] **Phase 5 — Social and Chess:** Public profiles, username search, friendship requests/list, blocking, activity/notifications, private friend invitations, server-validated Chess moves, reconnects, and persisted match history are implemented. Current unit/socket tests pass. The database-backed Social API test remains opt-in and was skipped because no disposable test database was verified; real account-to-account browser play remains unverified here.
* [x] **Phase 6 — PWA:** Manifest, app icons, generated service worker, install prompt/help, static-only caching, automatic updates, offline fallback, network status, and offline practice are implemented. Production artifact tests pass; physical-device installation and offline/update checks remain.
* [x] **UI/UX and Responsive Pass:** The shared interface now uses a navy background with blue/indigo/violet accents. The 320 px home-header overflow was fixed. Home was checked at 320/390/768 px; login and registration were checked at 320 px. Protected page layouts still need visual checks with an authenticated test account.
* [ ] **Phase 7 — Quality and Release:** QA automation, configurable production CORS, focus/reduced-motion defaults, route-level bundle splitting, and deployment/API documentation are present. Database integration, protected-page responsive review, full accessibility review, and target-device PWA checks remain before release sign-off.

Develop and test each phase independently before moving to the next. Reuse existing authentication, score processing, and challenge logic wherever possible instead of duplicating it.

## Screenshots

Add screenshots or GIFs of the actual implemented application.

Suggested screenshots:

* Home or game selection page.
* Gameplay screen.
* Global and per-game leaderboards.
* Achievement and challenge pages.
* Admin dashboard.
* Ranked, Quest, and Analytics pages currently implemented.
* Social features and the PWA installation/offline experience.

Example:

```md
![GameHub Dashboard](docs/screenshots/dashboard.png)
```

Ensure the referenced image exists in the repository before adding it to the README.

## License

This project is intended to use the MIT License. Ensure that a `LICENSE` file containing the MIT License is present in the repository before claiming that the project is formally distributed under that license.
