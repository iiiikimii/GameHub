# 🎮 GameHub — Vibe Coding Master Prompt

## 1. Project Overview

Build a modern full-stack web application called **GameHub**.

GameHub is a gaming platform where users can register, play small browser games, earn scores, unlock achievements, complete daily challenges, and compete on leaderboards.

The goal is to create a **professional portfolio-quality full-stack project**, not a basic CRUD application.

The application must have:

- Modern responsive UI
- Authentication
- User profiles
- Multiple mini-games
- Score submission
- Global leaderboard
- Achievements
- Daily challenges
- Game history
- Admin dashboard
- REST API
- Relational database
- Secure authentication
- Clean architecture
- Good UX
- Loading, empty, error, and success states

---

# 2. Main Technology Stack

Use the following stack unless there is a strong technical reason not to.

## Frontend

- React.js
- Vite
- JavaScript / JSX
- React Router
- Tailwind CSS
- Axios
- Lucide React
- Recharts

## Backend

- Node.js
- Express.js
- JavaScript
- JWT authentication
- bcrypt

## Database

- MySQL
- mysql2

## Development Environment

- Windows 11
- VS Code
- XAMPP for MySQL

Do NOT introduce TypeScript unless explicitly requested.

Do NOT use Next.js.

Do NOT use Firebase or Supabase.

The backend must be a separate Express server.

---

# 3. Project Structure

Use this structure:

```text
GameHub/
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── games/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── context/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── database/
│   └── schema.sql
│
├── README.md
└── .gitignore
```

Keep frontend and backend clearly separated.

---

# 4. Visual Design

Create a polished gaming dashboard.

Design direction:

- Dark modern UI
- Gaming / esports atmosphere
- Clean rather than overly flashy
- Rounded cards
- Subtle gradients
- Smooth hover animations
- Good spacing
- Responsive layout
- Desktop-first but mobile friendly

Suggested visual concept:

```text
Background:
Very dark navy / charcoal

Primary:
Electric purple / violet

Secondary:
Cyan / blue

Success:
Green

Warning:
Yellow

Danger:
Red
```

Do not overuse gradients.

Do not make the interface look like a generic admin template.

---

# 5. Application Layout

## Desktop

Use a sidebar layout.

```text
┌─────────────────────────────────────────────────────────┐
│ GAMEHUB                                      Profile 🔔 │
├───────────────┬─────────────────────────────────────────┤
│               │                                         │
│ 🎮 GameHub    │              Main Content               │
│               │                                         │
│ Dashboard     │                                         │
│ Games         │                                         │
│ Leaderboard   │                                         │
│ Challenges    │                                         │
│ Achievements  │                                         │
│ History       │                                         │
│ Profile       │                                         │
│               │                                         │
│               │                                         │
│ Admin         │                                         │
│ Settings      │                                         │
│ Logout        │                                         │
│               │                                         │
└───────────────┴─────────────────────────────────────────┘
```

On mobile, convert the sidebar into a responsive navigation menu.

---

# 6. Authentication

Implement:

- Register
- Login
- Logout
- Get current user
- JWT authentication
- Password hashing with bcrypt
- Protected routes
- Admin role

Registration fields:

```text
Username
Email
Password
Confirm Password
```

Login:

```text
Email / Username
Password
```

Validation must happen on both frontend and backend.

Never store plain-text passwords.

---

# 7. User Roles

There are two roles:

```text
USER
ADMIN
```

Normal users can:

- Play games
- Submit scores
- View leaderboard
- Earn achievements
- Complete daily challenges
- Edit profile
- View history

Admins can:

- Manage users
- Manage games
- Manage challenges
- View statistics
- Delete inappropriate records
- View system activity

Protect admin API endpoints with middleware.

---

# 8. Database Design

Create a MySQL database named:

```sql
gamehub
```

Create at least these tables:

## users

```text
id
username
email
password
avatar
role
total_score
created_at
updated_at
```

## games

```text
id
name
slug
description
category
difficulty
thumbnail
is_active
created_at
```

## scores

```text
id
user_id
game_id
score
duration
created_at
```

## achievements

```text
id
name
description
icon
requirement_type
requirement_value
created_at
```

## user_achievements

```text
id
user_id
achievement_id
unlocked_at
```

## challenges

```text
id
title
description
game_id
target_score
reward_points
start_date
end_date
is_active
```

## challenge_progress

```text
id
user_id
challenge_id
progress
completed
completed_at
```

## game_sessions

```text
id
user_id
game_id
score
duration
played_at
```

Add proper:

- Primary keys
- Foreign keys
- Indexes
- Unique constraints

---

# 9. Dashboard

The dashboard should immediately show useful information.

Example:

```text
Good evening, Kimi 👋

┌────────────┐ ┌────────────┐ ┌────────────┐
│ Total Score│ │ Games Played│ │ Achievements│
│   12,450   │ │     84      │ │    17/30    │
└────────────┘ └────────────┘ └────────────┘

Daily Challenge
────────────────────────────────
Reaction Master
Score: 850 / 1000
████████████████░░░░ 85%

Continue Playing
────────────────────────────────

[ Reaction Test ]
[ Memory Match ]
[ Number Rush ]
```

Include:

- Total score
- Games played
- Current rank
- Achievements
- Daily challenge
- Recent games
- Recommended games

---

# 10. Mini Games

The initial version must include at least 3 playable games.

## Game 1 — Reaction Test

Gameplay:

1. Player clicks Start.
2. Screen waits a random amount of time.
3. Screen changes state.
4. Player must click as quickly as possible.
5. Calculate reaction time.
6. Convert performance into score.
7. Save result.

Example:

```text
WAIT...

       ⚡

CLICK!
```

Score should reward faster reaction time.

Prevent obviously invalid scores.

---

# 11. Game 2 — Number Rush

Gameplay:

1. Show random numbers.
2. Player must click numbers in ascending order.
3. Use a countdown timer.
4. Incorrect clicks reduce score.
5. Complete the sequence to finish.
6. Save final score.

Example:

```text
TIME: 18.2

  7    2    9
  1    5    3
  8    4    6
```

---

# 12. Game 3 — Memory Match

Gameplay:

1. Generate a grid of cards.
2. Cards start hidden.
3. Player clicks two cards.
4. Matching cards remain revealed.
5. Non-matching cards flip back.
6. Count moves.
7. Count completion time.
8. Calculate score.

Difficulty:

```text
Easy   → 4 pairs
Medium → 6 pairs
Hard   → 8 pairs
```

---

# 13. Game Architecture

Each game must be isolated.

Example:

```text
frontend/src/games/
├── ReactionTest/
│   ├── ReactionTest.jsx
│   ├── components/
│   └── utils.js
│
├── NumberRush/
│   ├── NumberRush.jsx
│   ├── components/
│   └── utils.js
│
└── MemoryMatch/
    ├── MemoryMatch.jsx
    ├── components/
    └── utils.js
```

Do not put all game logic inside one giant component.

---

# 14. Score System

After a game finishes:

```text
Game Complete 🎉

Score
1,240

Time
42.3 seconds

Accuracy
94%

[ Submit Score ]
[ Play Again ]
[ Back to Games ]
```

The backend must validate submitted scores as much as reasonably possible.

Do not blindly trust client-provided scores.

Store:

- User
- Game
- Score
- Duration
- Timestamp

---

# 15. Leaderboard

Create a global leaderboard.

Show:

```text
🏆 GLOBAL LEADERBOARD

Rank   Player        Score
────────────────────────────
🥇     PlayerOne     45,820
🥈     Kimi          42,510
🥉     Shadow        39,420
4      Neo           35,800
5      Alice         34,120
```

Features:

- Global ranking
- Per-game ranking
- Current user's rank
- Pagination
- Search users

Highlight the logged-in user.

---

# 16. Achievements

Create achievements such as:

```text
🎮 First Game
Play your first game.

🔥 Getting Started
Reach 1,000 total points.

⚡ Speed Demon
Get a reaction time below 250ms.

🏆 Champion
Reach #1 on a leaderboard.

💯 Dedicated
Play 100 games.

🧠 Memory Master
Complete Memory Match on Hard.

📅 Daily Player
Complete 7 daily challenges.
```

Show locked and unlocked achievements.

Locked:

```text
🔒
???
Locked
```

Unlocked:

```text
🏆
Speed Demon
Unlocked
```

---

# 17. Daily Challenges

Every day users receive challenges.

Examples:

```text
DAILY CHALLENGES

⚡ Reaction Master
Get a score above 800.

Progress:
████████████░░ 80%

Reward:
+500 points
```

When completed:

```text
🎉 Challenge Complete!

+500 XP
```

The backend must determine whether the challenge is completed.

---

# 18. Game History

Create a history page.

Show:

```text
Game              Score     Time       Date
─────────────────────────────────────────────
Reaction Test     950       0.32s      Today
Memory Match      1,420     38s        Today
Number Rush       780       52s        Yesterday
```

Allow filtering by:

- Game
- Date
- Score

---

# 19. Profile

Profile page:

```text
        👤

        Kimi
     @iiiikimii

Total Score
42,510

Rank
#12

Games Played
84

Achievements
17
```

Show:

- Avatar
- Username
- Email
- Total score
- Rank
- Games played
- Achievements
- Favorite game
- Recent scores

Allow username/avatar updates.

---

# 20. Admin Dashboard

Create:

```text
/admin
```

Dashboard statistics:

```text
Total Users
1,245

Games Played
18,450

Total Scores
18,450

Active Challenges
5
```

Admin pages:

```text
Users
Games
Challenges
Scores
System Statistics
```

User management:

- Search users
- Change role
- Disable account
- Delete account

Game management:

- Create game
- Edit game
- Activate/deactivate game

Challenge management:

- Create challenge
- Edit challenge
- Activate/deactivate challenge

---

# 21. REST API

Use RESTful API structure.

Example:

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/games
GET    /api/games/:id
POST   /api/games
PUT    /api/games/:id
DELETE /api/games/:id

POST   /api/scores
GET    /api/scores/history
GET    /api/leaderboard
GET    /api/leaderboard/:gameId

GET    /api/achievements
GET    /api/achievements/me

GET    /api/challenges
GET    /api/challenges/today
POST   /api/challenges/:id/complete

GET    /api/profile
PUT    /api/profile
```

Admin routes:

```text
GET    /api/admin/users
PUT    /api/admin/users/:id
DELETE /api/admin/users/:id

POST   /api/admin/games
PUT    /api/admin/games/:id
DELETE /api/admin/games/:id

POST   /api/admin/challenges
PUT    /api/admin/challenges/:id
DELETE /api/admin/challenges/:id
```

---

# 22. Backend Architecture

Use:

```text
routes
   ↓
controllers
   ↓
services
   ↓
database
```

Example:

```text
routes/scoreRoutes.js
        ↓
controllers/scoreController.js
        ↓
services/scoreService.js
        ↓
database
```

Create middleware:

```text
authMiddleware
adminMiddleware
errorMiddleware
```

Do not put all backend logic in `server.js`.

---

# 23. Security Requirements

Implement reasonable security practices.

Must include:

- bcrypt password hashing
- JWT authentication
- Environment variables
- Input validation
- SQL parameterized queries
- CORS configuration
- Protected admin routes
- Authentication middleware
- Basic rate limiting where appropriate
- Never expose password hashes through API responses

`.env` example:

```env
PORT=5000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=gamehub

JWT_SECRET=change_this_secret
```

Never commit `.env`.

Create:

```text
.env.example
```

---

# 24. Frontend Services

Use Axios.

Create:

```text
services/
├── api.js
├── authService.js
├── gameService.js
├── scoreService.js
├── leaderboardService.js
├── achievementService.js
└── challengeService.js
```

Do not scatter Axios calls throughout every component.

---

# 25. Authentication Context

Create:

```text
context/AuthContext.jsx
```

It should manage:

```text
user
token
login()
register()
logout()
loading
```

Persist authentication appropriately.

Protected routes should redirect unauthenticated users to:

```text
/login
```

Admin routes should redirect non-admin users.

---

# 26. Pages

Create at minimum:

```text
/
 /login
 /register
 /dashboard
 /games
 /games/:slug
 /leaderboard
 /challenges
 /achievements
 /history
 /profile
 /admin
 /admin/users
 /admin/games
 /admin/challenges
 /admin/scores
```

---

# 27. Landing Page

The landing page should look professional.

Hero:

```text
PLAY.
COMPETE.
LEVEL UP.

Your games.
Your score.
Your leaderboard.

[ Start Playing ]
[ View Leaderboard ]
```

Below it:

```text
Popular Games
```

Then:

```text
How GameHub Works
```

Then:

```text
Compete with players worldwide.
```

Then footer.

---

# 28. Game Cards

Create reusable GameCard component.

Example:

```text
┌────────────────────────────┐
│                            │
│      GAME THUMBNAIL        │
│                            │
├────────────────────────────┤
│ Reaction Test              │
│ Test your reaction speed.  │
│                            │
│ ⚡ Easy      👥 12.4K      │
│                            │
│ [ Play Now ]               │
└────────────────────────────┘
```

---

# 29. Reusable Components

Create reusable components such as:

```text
Navbar
Sidebar
Button
Input
Modal
Card
GameCard
StatCard
LeaderboardTable
AchievementCard
ChallengeCard
LoadingSpinner
EmptyState
ErrorState
Toast
ConfirmDialog
Avatar
Badge
ProgressBar
Pagination
```

Avoid duplicate UI code.

---

# 30. Error Handling

Every API request must handle:

- Loading
- Success
- Error
- Empty state

Example:

```text
Loading...

Unable to load leaderboard.

[ Try Again ]
```

Do not leave users with blank screens.

---

# 31. Toast Notifications

Use toast notifications for:

```text
Login successful
Game score submitted
Achievement unlocked
Challenge completed
Profile updated
Game deleted
```

Errors should also show readable messages.

---

# 32. Responsive Design

The application must work on:

```text
Desktop
Laptop
Tablet
Mobile
```

Test at approximately:

```text
1920px
1440px
1024px
768px
390px
```

No horizontal overflow.

---

# 33. UX Requirements

Important:

- Buttons must have clear hover states.
- Disabled buttons must look disabled.
- Forms must show validation.
- Loading states must be visible.
- Empty states must be informative.
- Destructive actions require confirmation.
- Navigation must clearly show the current page.
- Game controls must be easy to understand.
- Avoid unnecessary animations.

---

# 34. Seed Data

Create realistic seed data.

At least:

```text
10 users
3 games
8 achievements
5 challenges
30 score records
```

Create a database seed script or SQL seed section.

Use fake data only.

---

# 35. README

Create a professional README containing:

```text
GameHub
├── Overview
├── Features
├── Screenshots
├── Tech Stack
├── Architecture
├── Database
├── API Documentation
├── Installation
├── Environment Variables
├── Running the Project
├── Admin Account
├── Future Improvements
└── License
```

Include setup commands.

Example:

```bash
git clone <repository-url>

cd GameHub

cd backend
npm install

cd ../frontend
npm install
```

---

# 36. Git Configuration

Create `.gitignore`.

Include:

```text
node_modules/
.env
dist/
.vite/
*.log
```

Never commit secrets.

---

# 37. Development Rules

IMPORTANT:

Do NOT generate the entire project blindly in one giant response.

Build the project incrementally.

Follow this order:

```text
PHASE 1
Project setup

PHASE 2
Database

PHASE 3
Backend foundation

PHASE 4
Authentication

PHASE 5
Frontend foundation

PHASE 6
Dashboard

PHASE 7
Game system

PHASE 8
Leaderboard

PHASE 9
Achievements

PHASE 10
Challenges

PHASE 11
Profile & history

PHASE 12
Admin dashboard

PHASE 13
Security & validation

PHASE 14
Responsive UI

PHASE 15
Testing

PHASE 16
README & cleanup
```

After each phase:

1. Explain what was created.
2. Tell me exactly which command to run.
3. Ask me to confirm the result.
4. Only continue after confirmation.

Do NOT assume a command succeeded.

---

# 38. Coding Rules

Follow these rules strictly:

1. Use JavaScript, not TypeScript.
2. Use `.jsx` for React components.
3. Keep components reasonably small.
4. Avoid giant files.
5. Use reusable components.
6. Use meaningful variable names.
7. Do not hardcode secrets.
8. Use `.env`.
9. Use parameterized SQL queries.
10. Validate backend input.
11. Validate frontend forms.
12. Handle errors properly.
13. Do not silently ignore errors.
14. Do not delete existing working code without explaining why.
15. Do not install unnecessary packages.
16. Prefer simple solutions over overengineering.
17. Do not introduce libraries without explaining their purpose.
18. Keep the project beginner-friendly.
19. Add comments only where they improve understanding.
20. Keep API and frontend responsibilities separated.

---

# 39. Vibe Coding Behavior

Act as a senior full-stack developer working together with me.

I am the project owner.

When I ask for a feature:

1. Understand the existing architecture first.
2. Inspect relevant files.
3. Explain what needs to change.
4. Make the smallest reasonable change.
5. Do not rewrite unrelated files.
6. Tell me which files changed.
7. Explain how to test it.
8. If an error occurs, debug the actual error instead of guessing.

If a requirement is ambiguous, choose the simplest professional implementation and clearly state the assumption.

Do not constantly ask unnecessary questions.

---

# 40. Error Debugging Behavior

If I give you an error such as:

```text
Module not found
500 Internal Server Error
Cannot read properties of undefined
SQL error
CORS error
JWT error
```

Do this:

```text
1. Identify the likely cause.
2. Ask for the relevant file only if necessary.
3. Explain the problem simply.
4. Give the exact fix.
5. Give the exact command to retest.
```

Do not randomly rewrite the entire application.

---

# 41. API Response Format

Prefer consistent responses.

Success:

```json
{
  "success": true,
  "message": "Score submitted successfully",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Unable to submit score"
}
```

Use appropriate HTTP status codes.

---

# 42. Game Score Security

Never completely trust the score sent by the browser.

For games where possible:

- Validate score ranges.
- Validate duration.
- Validate session ownership.
- Prevent duplicate submissions.
- Reject impossible values.
- Store game session information.

For example:

A reaction time of:

```text
0ms
```

should not automatically be accepted.

---

# 43. Performance

Keep the application reasonably fast.

Frontend:

- Avoid unnecessary API requests.
- Use loading states.
- Lazy-load large pages when useful.
- Avoid unnecessary re-renders.

Backend:

- Use database indexes.
- Use pagination.
- Avoid SELECT * when unnecessary.
- Use efficient queries.

---

# 44. Final Quality Checklist

Before considering the project finished, verify:

## Frontend

- [ ] Landing page
- [ ] Login
- [ ] Register
- [ ] Dashboard
- [ ] Games
- [ ] Reaction Test
- [ ] Number Rush
- [ ] Memory Match
- [ ] Leaderboard
- [ ] Achievements
- [ ] Challenges
- [ ] History
- [ ] Profile
- [ ] Admin dashboard
- [ ] Responsive UI
- [ ] Loading states
- [ ] Error states
- [ ] Empty states

## Backend

- [ ] Express server
- [ ] Authentication
- [ ] JWT
- [ ] bcrypt
- [ ] User API
- [ ] Games API
- [ ] Scores API
- [ ] Leaderboard API
- [ ] Achievement API
- [ ] Challenge API
- [ ] Admin API
- [ ] Error middleware
- [ ] Auth middleware
- [ ] Admin middleware

## Database

- [ ] Users
- [ ] Games
- [ ] Scores
- [ ] Achievements
- [ ] User achievements
- [ ] Challenges
- [ ] Challenge progress
- [ ] Game sessions
- [ ] Foreign keys
- [ ] Indexes
- [ ] Seed data

## Security

- [ ] Password hashing
- [ ] JWT
- [ ] Input validation
- [ ] Parameterized SQL
- [ ] CORS
- [ ] Protected routes
- [ ] Admin protection
- [ ] `.env`
- [ ] `.gitignore`

---

# 45. Start Here

Begin with **PHASE 1 — Project Setup**.

Do NOT implement everything immediately.

First:

1. Create the root `GameHub` folder.
2. Create `frontend`.
3. Create `backend`.
4. Create `database`.
5. Initialize the React/Vite frontend.
6. Initialize the Express backend.
7. Install only the required initial dependencies.
8. Make sure both frontend and backend run successfully.
9. Then stop and ask me to confirm.

Frontend should eventually run on:

```text
http://localhost:5173
```

Backend should eventually run on:

```text
http://localhost:5000
```

After both are working, continue to Phase 2.

---

# 46. Important Instruction

This is a **portfolio project**.

The final result should look like something a junior/full-stack developer could confidently show on GitHub or during a job interview.

Prioritize:

```text
Clean Code
Good Architecture
Modern UI
Real Functionality
Security
Good UX
Professional Documentation
```

Do not prioritize adding dozens of unnecessary features.

Build a smaller number of features properly.
