# Movie App Authentication System

This is a full-stack web app with React frontend and Node.js/Express backend with MongoDB for authentication.

## Setup

### Backend
1. Navigate to `backend` folder.
2. Run `npm install`.
3. Set up MongoDB locally or use a cloud service.
4. Update `.env` with your values.
5. Run `npm start` or `npm run dev`.

### Frontend
1. In root folder, run `npm install`.
2. Run `npm start` to start React app on port 3000.

## Features
- Email/password registration and login.
- Google OAuth login.
- JWT-based authentication.
- Protected routes for Movies and Series pages.
- Redirect to Main after login.

## API Endpoints
- POST /auth/register
- POST /auth/login
- GET /auth/google
- GET /auth/google/callback