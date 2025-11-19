import os
from urllib.parse import quote_plus
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
from models import db
from routes import api

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')

# Database configuration - handle Railway's postgres:// vs SQLAlchemy's postgresql://
database_url = os.environ.get('DATABASE_URL', '').strip()

# If DATABASE_URL is empty or not set, use SQLite
if not database_url:
    database_url = 'sqlite:///database.db'
    print("No DATABASE_URL found, using SQLite")
else:
    print(f"DATABASE_URL detected (length: {len(database_url)})")

    # Handle postgres:// to postgresql:// conversion for SQLAlchemy
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
        print("Converted postgres:// to postgresql://")

    # Handle special characters in password (e.g., # symbol)
    # Parse and re-encode the URL to handle special characters properly
    if database_url.startswith('postgresql://'):
        try:
            # Extract parts: postgresql://user:password@host:port/database
            import re
            match = re.match(r'postgresql://([^:]+):([^@]+)@(.+)', database_url)
            if match:
                user, password, rest = match.groups()
                # URL encode the password to handle special characters
                encoded_password = quote_plus(password)
                database_url = f'postgresql://{user}:{encoded_password}@{rest}'
                print("Password encoded for special characters")
            else:
                print("Warning: Could not extract password from DATABASE_URL")
        except Exception as e:
            print(f"Warning: Could not parse database URL: {e}")

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
print(f"Final database URI scheme: {database_url.split(':')[0] if database_url else 'none'}")

# Configure CORS - allow frontend URL from environment or localhost
allowed_origins = [
    os.environ.get('FRONTEND_URL', 'http://localhost:3001'),
    'http://localhost:3001',
    'http://localhost:3000',
    'https://training-lms-production-f822.up.railway.app'
]

# Initialize extensions
CORS(app, resources={r"/api/*": {
    "origins": allowed_origins,
    "allow_headers": ["Content-Type", "Authorization"],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}}, supports_credentials=True)
jwt = JWTManager(app)
db.init_app(app)

# JWT error handlers
@jwt.invalid_token_loader
def invalid_token_callback(error):
    return {'error': 'Invalid token', 'message': str(error)}, 422

@jwt.unauthorized_loader
def unauthorized_callback(error):
    return {'error': 'Missing authorization header', 'message': str(error)}, 401

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_data):
    return {'error': 'Token has expired'}, 401

# Register blueprints
app.register_blueprint(api, url_prefix='/api')


@app.route('/')
def index():
    return {'message': 'Learning Management System API', 'status': 'running'}, 200


@app.route('/health')
def health():
    return {'status': 'healthy'}, 200


# Create tables - with error handling for database connectivity issues
with app.app_context():
    try:
        db.create_all()
        print("Database tables created successfully")
    except Exception as e:
        print(f"Warning: Could not create database tables: {e}")
        print("Database will be initialized on first request")


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
