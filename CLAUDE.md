# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack Learning Management System (LMS) built with Flask (Python) backend and React (TypeScript) frontend. Users can register, login, and access day-wise learning content including Jupyter notebooks (executable in-browser via Pyodide) and PDFs.

## Development Commands

### Backend (Flask)

**Setup:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Run development server:**
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python app.py
```

**Create database tables:**
Tables are created automatically on first run via `app.py`. To recreate:
```bash
cd backend
python -c "from app import app, db; app.app_context().push(); db.create_all()"
```

### Frontend (React + TypeScript)

**Setup:**
```bash
cd frontend
npm install
```

**Run development server:**
```bash
cd frontend
npm start
```

**Build for production:**
```bash
cd frontend
npm run build
```

**Type checking:**
```bash
cd frontend
npx tsc --noEmit
```

## Architecture

### Backend Architecture

**Database Models (models.py):**
- `User`: Stores user credentials and metadata
  - Fields: id, username, email, password_hash, created_at, last_login
  - Relationship: One-to-many with UserProgress
- `UserProgress`: Tracks user progress per day
  - Fields: id, user_id, day_number, completed, last_accessed, time_spent
  - Unique constraint: (user_id, day_number)

**Authentication Flow (auth.py):**
1. Passwords hashed with bcrypt before storage
2. JWT tokens generated on login/register
3. Access token + refresh token returned to client
4. Tokens validated via Flask-JWT-Extended decorators

**API Routes (routes.py):**
- Authentication: `/api/auth/register`, `/api/auth/login`, `/api/user/me`
- Content: `/api/days`, `/api/days/<day>/content`, `/api/days/<day>/notebook/<file>`, `/api/days/<day>/pdf/<file>`
- Progress: `/api/progress`, `/api/progress/<day>`
- All content routes require `@jwt_required()` decorator
- File serving includes path traversal validation (no `/` or `\` in filenames)

**Content Discovery:**
- Backend scans `PUBLIC_FOLDER` (default: `../public`) for `dayN` directories
- Each day folder can contain `.ipynb` files, `.pdf` files, and optional `metadata.json`
- Metadata provides title and description for each day

### Frontend Architecture

**Component Hierarchy:**
```
App
├── Navbar (shown when authenticated)
├── Routes
    ├── Login/Register (public)
    ├── Dashboard (protected)
    │   └── Displays all days with progress
    ├── DayContent (protected)
        ├── Shows notebooks and PDFs for a day
        ├── NotebookViewer (modal-style overlay)
        │   └── Uses Pyodide for in-browser Python execution
        └── PDFViewer (modal-style overlay)
            └── Uses react-pdf for rendering
```

**State Management:**
- Authentication state stored in localStorage: `access_token`, `refresh_token`, `user`
- API client (utils/api.ts) automatically attaches tokens to requests
- 401 responses trigger automatic logout and redirect to login

**Notebook Execution (NotebookViewer.tsx):**
- Pyodide loaded from CDN on component mount
- Each code cell has individual "Run" button
- "Run All" executes cells sequentially
- stdout captured via `StringIO`, displayed below cells
- Errors caught and displayed in red

**PDF Viewing (PDFViewer.tsx):**
- PDF.js worker loaded from CDN
- Controls: prev/next page, zoom in/out/reset
- PDF blob fetched from backend API, converted to object URL

**Protected Routes:**
- `ProtectedRoute` component checks `isAuthenticated()` helper
- Redirects to `/login` if no token present
- Wrapped around Dashboard and DayContent routes

## Key Technical Details

### Adding New Learning Content

Create a new day folder in `public/`:
```bash
mkdir public/day3
```

Add files:
```
public/day3/
├── lesson.ipynb       # Jupyter notebook
├── reference.pdf      # PDF document
└── metadata.json      # Optional metadata
```

Example `metadata.json`:
```json
{
  "title": "Python Control Flow",
  "description": "Learn about if statements, loops, and functions"
}
```

Backend automatically detects new days on next API call.

### Security Considerations

- **Password Security**: bcrypt hashing with salt (auth.py:hash_password)
- **Path Traversal**: Filename validation prevents directory traversal (routes.py, lines checking for `/` and `\`)
- **JWT Expiration**: Configure via Flask-JWT-Extended settings
- **CORS**: Currently allows all origins (`*`) - restrict in production
- **Environment Variables**: Secrets in `.env` files (gitignored)

### Database Schema

SQLite database (`database.db`) with two tables:
- `users`: Primary user data
- `user_progress`: Progress tracking with composite unique constraint

SQLAlchemy ORM handles migrations implicitly via `db.create_all()`.

### Frontend API Integration

All API calls go through `utils/api.ts`:
- Base axios instance with `API_URL` from env
- Request interceptor adds JWT token
- Response interceptor handles 401 errors globally
- Typed response interfaces in `types/index.ts`

### Pyodide Integration

NotebookViewer loads Pyodide v0.25.0 from CDN:
- Packages pre-loaded: numpy, matplotlib
- Execution context persists across cells
- stdout redirected to StringIO for capture
- Async execution with loading states

## Common Tasks

### Adding a New API Endpoint

1. Add route function in `backend/routes.py`
2. Use `@jwt_required()` if authentication needed
3. Add corresponding function in `frontend/src/utils/api.ts`
4. Update TypeScript types in `frontend/src/types/index.ts`

### Modifying Database Schema

1. Update model in `backend/models.py`
2. Delete `backend/database.db`
3. Restart backend to recreate tables
4. For production: use Flask-Migrate for proper migrations

### Adding Frontend Dependencies

```bash
cd frontend
npm install <package>
```

Update types if needed:
```bash
npm install --save-dev @types/<package>
```

### Adding Backend Dependencies

```bash
cd backend
source venv/bin/activate
pip install <package>
pip freeze > requirements.txt
```

## File Organization

**Backend:**
- `app.py`: Flask app initialization, CORS, JWT config
- `models.py`: SQLAlchemy models only
- `auth.py`: Authentication business logic (no routes)
- `routes.py`: All API endpoints

**Frontend:**
- `components/`: React components (one per file)
- `utils/`: API client, auth helpers
- `types/`: TypeScript interfaces
- `styles/`: CSS files (one per component)

## Development Tips

- Backend runs on port 5000, frontend on 3000 (proxied in development)
- Hot reload enabled for both backend (Flask debug mode) and frontend (React)
- Check browser console for frontend errors, terminal for backend errors
- JWT tokens expire after default time (configure in app.py)
- Pyodide takes ~2-3 seconds to load initially
