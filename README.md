# Leave Management Website

A beginner-friendly full-stack Leave Management website using React, Vite, Express, Node.js, and MongoDB.

## Features
- Dashboard summary cards
- Apply for leave
- View leave requests
- Approve/reject requests
- Search and filter requests
- MongoDB persistence when configured; in-memory fallback for quick UI testing

## Requirements
- Node.js 18+ (recommended Node.js 20+)
- VS Code
- MongoDB Community Server running locally OR a MongoDB Atlas connection string

## 1. Open the project
Extract this folder, then open the `leave-management-website` folder in VS Code.

## 2. Install packages
Open Terminal > New Terminal in VS Code and run:

```bash
npm install
npm run install:all
```

## 3. Configure MongoDB (optional but recommended)
Create `server/.env` by copying `server/.env.example` to `server/.env`, then set `MONGO_URI`.

Example for local MongoDB:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/leave_management
```

If you don't have MongoDB running yet, the server will use temporary in-memory storage so you can try the website. Data in fallback mode disappears when the server restarts.

## 4. Run frontend and backend
From the root project folder:

```bash
npm run dev
```

Open the frontend URL shown by Vite, usually http://localhost:5173.
Backend API: http://localhost:5000/api/health

## Troubleshooting
- If `npm` is not recognized, install Node.js LTS and restart VS Code.
- If port 5173 or 5000 is already in use, stop the other project or change the port.
- If you see MongoDB connection errors, check that MongoDB is running and `server/.env` has the correct URI.
- To stop the app, press `Ctrl+C` in the terminal.
