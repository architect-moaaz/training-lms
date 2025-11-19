import bcrypt
import requests
from flask_jwt_extended import create_access_token, create_refresh_token
from models import db, User
from datetime import datetime


def hash_password(password):
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(password, password_hash):
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))


def get_location_from_ip(ip_address):
    """Get location information from IP address using ip-api.com (free)"""
    if not ip_address or ip_address == '127.0.0.1' or ip_address.startswith('192.168'):
        return {'country': 'Local', 'city': 'Local'}

    try:
        response = requests.get(f'http://ip-api.com/json/{ip_address}', timeout=5)
        if response.status_code == 200:
            data = response.json()
            return {
                'country': data.get('country', 'Unknown'),
                'city': data.get('city', 'Unknown')
            }
    except Exception as e:
        print(f"Error fetching location for IP {ip_address}: {e}")

    return {'country': 'Unknown', 'city': 'Unknown'}


def register_user(username, email, password, ip_address=None):
    """Register a new user"""
    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return {'error': 'Email already registered'}, 400

    if User.query.filter_by(username=username).first():
        return {'error': 'Username already taken'}, 400

    # Validate inputs
    if not username or len(username) < 3:
        return {'error': 'Username must be at least 3 characters'}, 400

    if not email or '@' not in email:
        return {'error': 'Invalid email address'}, 400

    if not password or len(password) < 6:
        return {'error': 'Password must be at least 6 characters'}, 400

    # Get location from IP
    location = get_location_from_ip(ip_address) if ip_address else {'country': 'Unknown', 'city': 'Unknown'}

    # Create new user
    password_hash = hash_password(password)
    new_user = User(
        username=username,
        email=email,
        password_hash=password_hash,
        registration_ip=ip_address,
        registration_country=location.get('country'),
        registration_city=location.get('city')
    )

    db.session.add(new_user)
    db.session.commit()

    # Generate tokens
    access_token = create_access_token(identity=str(new_user.id))
    refresh_token = create_refresh_token(identity=str(new_user.id))

    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': new_user.to_dict()
    }, 201


def login_user(email_or_username, password):
    """Login a user"""
    # Find user by email or username
    user = User.query.filter(
        (User.email == email_or_username) | (User.username == email_or_username)
    ).first()

    if not user:
        return {'error': 'Invalid credentials'}, 401

    # Verify password
    if not verify_password(password, user.password_hash):
        return {'error': 'Invalid credentials'}, 401

    # Update last login
    user.last_login = datetime.utcnow()
    db.session.commit()

    # Generate tokens
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user.to_dict()
    }, 200
