# IT Ticketing App

This repository is organized into separate frontend and backend folders for easier review and development.

## Project Structure

- `frontend/`
  - `index.html` - UI markup
  - `styles.css` - application styles
  - `app.js` - frontend logic and API calls

- `backend/`
  - `server.js` - Express server and API endpoints
  - `package.json` - backend dependencies and scripts
  - `package-lock.json` - locked dependency tree
  - `data/` - local JSON database file
  - `node_modules/` - installed backend packages

## Run Locally

1. Open a terminal in the repository root.
2. Change into the backend folder:
   ```powershell
   cd backend
   ```
3. Install dependencies if needed:
   ```powershell
   npm install
   ```
4. Set your PostgreSQL connection string if needed:
   ```powershell
   $env:DATABASE_URL = "postgres://user:password@localhost:5432/IT_Ticketing"
   ```
   Or use individual Postgres environment variables:
   ```powershell
   $env:PGHOST = "localhost"
   $env:PGUSER = "postgres"
   $env:PGPASSWORD = "your_password"
   $env:PGDATABASE = "IT_Ticketing"
   $env:PGPORT = "5432"
   ```
   Make sure `PGPASSWORD` is a string value.
5. Start the server:
   ```powershell
   npm start
   ```

The app serves the frontend from `../frontend` and exposes API routes under `/api`.

## Notes

- The backend currently uses a local JSON file at `backend/data/db.json`.
- Authentication is handled via JWT tokens.
- The static frontend is served from the `frontend/` folder.
