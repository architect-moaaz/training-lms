# Getting Started with LMS

This guide will help you get the Learning Management System up and running.

## Quick Start

### Option 1: Using the Start Script (Recommended)

**For macOS/Linux:**
```bash
./start.sh
```

**For Windows:**
```bash
start.bat
```

The script will automatically:
- Create Python virtual environment (if needed)
- Install backend dependencies (if needed)
- Install frontend dependencies (if needed)
- Start both backend and frontend servers

### Option 2: Manual Setup

#### Backend Setup

1. Open a terminal and navigate to the backend directory:
```bash
cd backend
```

2. Create and activate virtual environment:
```bash
# macOS/Linux
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the backend server:
```bash
python app.py
```

The backend will run on `http://localhost:5000`

#### Frontend Setup

1. Open a **new** terminal and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000` and automatically open in your browser.

## First Time Usage

1. **Register an Account**
   - Navigate to `http://localhost:3000`
   - You'll be redirected to the login page
   - Click "Register here"
   - Fill in username, email, and password
   - Click "Register"

2. **Access the Dashboard**
   - After registration, you'll be automatically logged in
   - You'll see the dashboard with available days
   - Sample content for Day 1 and Day 2 is already included

3. **View Learning Content**
   - Click on any day card to view its content
   - You'll see available notebooks and PDFs
   - Click on a notebook to open the interactive viewer
   - Click on a PDF to open the PDF viewer

4. **Execute Notebook Code**
   - In the notebook viewer, click the ▶ button next to any code cell
   - Wait for Pyodide to load (first time only, ~2-3 seconds)
   - The code will execute and show output below the cell
   - You can also click "Run All" to execute all cells sequentially

5. **Track Your Progress**
   - Click "Mark as Complete" when you finish a day
   - Your progress is saved and shown on the dashboard
   - Completed days show a green checkmark

## Project Structure

```
lms/
├── backend/              # Python Flask backend
│   ├── app.py           # Main application entry point
│   ├── models.py        # Database models (User, UserProgress)
│   ├── auth.py          # Authentication logic
│   ├── routes.py        # API endpoints
│   ├── requirements.txt # Python dependencies
│   └── .env            # Environment variables
├── frontend/            # React TypeScript frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── utils/       # API client and helpers
│   │   ├── types/       # TypeScript type definitions
│   │   └── styles/      # CSS stylesheets
│   ├── public/          # Static files
│   ├── package.json     # npm dependencies
│   └── .env            # Environment variables
├── public/              # Learning content repository
│   ├── day1/           # Day 1 materials
│   │   ├── introduction.ipynb
│   │   └── metadata.json
│   └── day2/           # Day 2 materials
│       ├── data_structures.ipynb
│       └── metadata.json
├── README.md           # Project documentation
├── GETTING_STARTED.md  # This file
├── CLAUDE.md          # Claude Code guidance
├── start.sh           # Quick start script (Unix)
└── start.bat          # Quick start script (Windows)
```

## Adding Your Own Content

To add a new day of learning materials:

1. Create a new directory in `public/`:
```bash
mkdir public/day3
```

2. Add your content files:
   - Jupyter notebooks (`.ipynb` files)
   - PDF documents (`.pdf` files)

3. Create `metadata.json` (optional but recommended):
```json
{
  "title": "Your Day Title",
  "description": "Brief description of what students will learn"
}
```

4. Restart the backend server (or just refresh the frontend)

The new day will automatically appear in the dashboard!

## Troubleshooting

### Backend Issues

**Problem:** `ModuleNotFoundError: No module named 'flask'`
**Solution:** Make sure you activated the virtual environment:
```bash
source backend/venv/bin/activate  # macOS/Linux
backend\venv\Scripts\activate      # Windows
```

**Problem:** `Address already in use` on port 5000
**Solution:** Kill the process using port 5000 or change the port in `backend/.env`

### Frontend Issues

**Problem:** `Cannot find module` errors
**Solution:** Install dependencies:
```bash
cd frontend
npm install
```

**Problem:** TypeScript errors
**Solution:** The project uses TypeScript strict mode. Check the error messages for type issues.

### Notebook Execution Issues

**Problem:** "Python runtime not loaded yet"
**Solution:** Wait a few seconds for Pyodide to load from the CDN on first run

**Problem:** Code cell not executing
**Solution:** Check the browser console for errors. Ensure you have internet connection (Pyodide loads from CDN)

## Development Tips

- **Backend logs**: Check the terminal where `python app.py` is running
- **Frontend logs**: Check the browser console (F12 → Console tab)
- **Database**: The SQLite database is created at `backend/database.db`
- **Authentication**: JWT tokens are stored in browser localStorage
- **Hot reload**: Both backend and frontend support hot reload - changes take effect automatically

## Next Steps

- Explore the sample notebooks in Day 1 and Day 2
- Try executing code cells in the notebook viewer
- Add your own learning content
- Customize the styling in `frontend/src/styles/`
- Add new API endpoints for additional features

## Getting Help

- Check `README.md` for detailed technical documentation
- Review `CLAUDE.md` for architecture and development guidelines
- Look at the sample content in `public/day1` and `public/day2` for examples

Happy Learning! 🚀
