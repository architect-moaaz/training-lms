# Learning Management System (LMS)

A full-stack web-based Learning Management System where users can register, login, and access day-wise learning content (Jupyter notebooks and PDFs) with the ability to execute notebook code in the browser.

## Tech Stack

- **Backend**: Python with Flask
- **Frontend**: React with TypeScript
- **Database**: SQLite
- **Notebook Execution**: Pyodide (browser-based Python execution)
- **PDF Viewer**: react-pdf
- **Authentication**: JWT tokens with bcrypt

## Project Structure

```
lms/
├── backend/              # Flask backend
│   ├── app.py           # Main application
│   ├── models.py        # Database models
│   ├── auth.py          # Authentication logic
│   ├── routes.py        # API endpoints
│   ├── requirements.txt # Python dependencies
│   └── .env            # Environment variables
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── utils/       # Utility functions
│   │   ├── types/       # TypeScript types
│   │   └── styles/      # CSS styles
│   ├── package.json
│   └── .env            # Environment variables
├── public/              # Learning content
│   ├── day1/
│   ├── day2/
│   └── ...
└── README.md
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables (already set in `.env`):
- The `.env` file is already created with development settings
- For production, update `SECRET_KEY` and `JWT_SECRET_KEY`

5. Run the backend server:
```bash
python app.py
```

The backend will start on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (already set in `.env`):
- The `.env` file points to `http://localhost:5000/api`

4. Start the development server:
```bash
npm start
```

The frontend will start on `http://localhost:3000`

## Features

### User Authentication
- User registration with validation
- Login with email/username
- JWT-based authentication
- Password hashing with bcrypt

### Dashboard
- View all available learning days
- Track progress across days
- See completion status
- Access learning materials

### Learning Content
- **Jupyter Notebooks**: Execute Python code in the browser using Pyodide
- **PDF Documents**: View PDFs with zoom and navigation controls
- Day-wise organization of content
- Progress tracking

### Notebook Features
- Run individual cells or all cells
- View output including stdout and return values
- Error handling with colored output
- Markdown rendering
- Code syntax display

### PDF Features
- Page navigation (prev/next)
- Zoom controls
- Page number display
- Full document viewing

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/user/me` - Get current user info

### Content
- `GET /api/days` - Get all available days
- `GET /api/days/<day_number>/content` - Get content for specific day
- `GET /api/days/<day_number>/notebook/<filename>` - Get notebook content
- `GET /api/days/<day_number>/pdf/<filename>` - Stream PDF file

### Progress
- `GET /api/progress` - Get user's progress
- `POST /api/progress/<day_number>` - Update progress for a day

## Adding New Content

To add new learning content:

1. Create a new day folder in `public/`:
```bash
mkdir public/day3
```

2. Add notebooks and PDFs:
```
public/day3/
├── lesson.ipynb
├── notes.pdf
└── metadata.json
```

3. Create `metadata.json`:
```json
{
  "title": "Day 3 Title",
  "description": "Description of day 3 content"
}
```

The system will automatically detect and display the new content.

## Development

### Running Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Building for Production

Frontend:
```bash
cd frontend
npm run build
```

Backend:
- Update `.env` with production settings
- Use a production WSGI server like Gunicorn:
```bash
pip install gunicorn
gunicorn app:app
```

## Security Notes

- Change `SECRET_KEY` and `JWT_SECRET_KEY` in production
- Use HTTPS in production
- Implement rate limiting for API endpoints
- Validate all user inputs
- Keep dependencies updated

## License

MIT License
