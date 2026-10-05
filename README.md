# GameHub

## Overview
GameHub is a modern, premium web-based mini-game platform. It allows users to play various games (Reflex, Puzzle, Memory), track their scores, unlock achievements, compete on global and per-game leaderboards, and complete daily challenges. It features an integrated Admin Dashboard to manage users, games, challenges, and scores.

## Features
- **Authentication**: JWT-based secure registration and login.
- **Premium UI/UX**: Professional glassmorphism design with responsive layouts across all devices (Desktop, Tablet, Mobile).
- **Mini-Games**:
  - Memory Match (Memory)
  - Number Rush (Puzzle)
  - Reaction Test (Reflex)
- **Leaderboards**: Global ranking based on total score and per-game leaderboards with intelligent tie-breakers.
- **Achievements & Challenges**: Unlock badges by reaching milestones and earn bonus points via daily/weekly challenges.
- **Admin Dashboard**: Full CRUD management of users, games, challenges, and score monitoring.
- **Security**: Rate limiting, password hashing (bcrypt), parameterized SQL queries to prevent injections, and secure API endpoints.

## Screenshots
*(Provide your screenshots here)*

## Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router DOM, Lucide React, Axios.
- **Backend**: Node.js, Express.js, MySQL (mysql2), JSON Web Tokens (jsonwebtoken), bcrypt, express-rate-limit.

## Architecture
- **Client-Server Architecture**: Separation of concerns between the React single-page application (SPA) and the Express RESTful API.
- **Database**: Relational data models optimized with proper indexing and foreign key constraints.

## Database
- MySQL relational database.
- Tables: `users`, `games`, `scores`, `game_sessions`, `achievements`, `user_achievements`, `challenges`, `challenge_progress`.

## API Documentation
Base URL: `/api`
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Authenticate user
- `GET /profile` - Retrieve user profile and stats
- `PUT /profile` - Update profile data
- `GET /games` - List active games
- `POST /scores` - Submit a new game score
- `GET /leaderboard` - Fetch global leaderboard
- `GET /leaderboard/:gameId` - Fetch game-specific leaderboard
- `GET /achievements` - Fetch user achievements
- `GET /challenges` - Fetch active challenges and progress
- `GET /admin/*` - Protected routes for admin management

## Installation
Ensure you have Node.js and MySQL installed.

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd GameHub
   ```

2. Backend Setup:
   ```bash
   cd backend
   npm install
   ```
   Create `.env` based on `.env.example` and set up the MySQL database using the provided schema.

3. Frontend Setup:
   ```bash
   cd ../frontend
   npm install
   ```
   Create `.env` based on `.env.example`.

## Environment Variables

**backend/.env**
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=gamehub
JWT_SECRET=your_super_secret_jwt_key
```

**frontend/.env**
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## Running the Project

Start the backend (Terminal 1):
```bash
cd backend
npm run dev
```

Start the frontend (Terminal 2):
```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

## Admin Account
For development and testing, you can create a user normally via the register page, and then manually update their role in the database to grant admin privileges:
```sql
UPDATE users SET role = 'ADMIN' WHERE username = 'your_username';
```

## Project Structure
```text
GameHub/
├── backend/
│   ├── config/          # DB config and environment setup
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth, admin, error handlers, rate limiting
│   ├── routes/          # Express router definitions
│   ├── services/        # Business logic and database queries
│   └── app.js & server.js
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable UI components (Cards, etc.)
│   │   ├── games/       # Mini-game implementations
│   │   ├── hooks/       # Custom React hooks (useAuth)
│   │   ├── layouts/     # Dashboard and Admin layouts
│   │   ├── pages/       # Route page components
│   │   └── services/    # API calls using Axios
│   └── index.css        # Tailwind definitions & custom CSS tokens
└── README.md
```

## Future Improvements
- **Social Features**: Add friends, messaging, and multiplayer game modes.
- **More Games**: Expand the game library with complex mechanics.
- **PWA Support**: Turn the application into a Progressive Web App for offline capabilities.
- **Localization**: Multi-language support.

## License
MIT License
