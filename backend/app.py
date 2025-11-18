import os
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
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Configure CORS - allow frontend URL from environment or localhost
allowed_origins = [
    os.environ.get('FRONTEND_URL', 'http://localhost:3001'),
    'http://localhost:3001',
    'http://localhost:3000'
]

# Initialize extensions
CORS(app, resources={r"/api/*": {"origins": allowed_origins}}, supports_credentials=True)
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


# Create tables
with app.app_context():
    db.create_all()
    print("Database tables created successfully")


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
