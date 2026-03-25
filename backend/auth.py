import os
import uuid
import secrets
import bcrypt
import requests
from flask_jwt_extended import create_access_token, create_refresh_token
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from models import db, User, Company, UserCompany
from email_service import send_verification_email, send_welcome_email
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


def _assign_company_by_invite_code(user, invite_code):
    """Assign user to a company via invite code. Returns True if assigned."""
    company = Company.query.filter_by(invite_code=invite_code, is_active=True).first()
    if not company:
        return False

    existing = UserCompany.query.filter_by(user_id=user.id, company_id=company.id).first()
    if not existing:
        uc = UserCompany(user_id=user.id, company_id=company.id, joined_via='invite_code')
        db.session.add(uc)
    return True


def _assign_companies_by_email_domain(user):
    """Auto-assign user to companies matching their email domain."""
    email_domain = user.email.split('@')[-1].lower()

    active_companies = Company.query.filter_by(is_active=True).all()
    for company in active_companies:
        domains = company.get_email_domains_list()
        if email_domain in domains:
            existing = UserCompany.query.filter_by(user_id=user.id, company_id=company.id).first()
            if not existing:
                uc = UserCompany(user_id=user.id, company_id=company.id, joined_via='email_domain')
                db.session.add(uc)


def register_user(username, email, password, ip_address=None, invite_code=None):
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

    # Create new user with email verification token
    password_hash = hash_password(password)
    verification_token = secrets.token_urlsafe(32)
    new_user = User(
        username=username,
        email=email,
        password_hash=password_hash,
        email_verified=False,
        email_verification_token=verification_token,
        registration_ip=ip_address,
        registration_country=location.get('country'),
        registration_city=location.get('city')
    )

    db.session.add(new_user)
    db.session.flush()  # Get user.id before committing

    # Assign to company via invite code
    if invite_code:
        _assign_company_by_invite_code(new_user, invite_code)

    # Auto-assign by email domain
    _assign_companies_by_email_domain(new_user)

    db.session.commit()

    # Send verification and welcome emails (non-blocking — failures don't break registration)
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    verify_url = f"{frontend_url}/verify-email?token={verification_token}"
    send_verification_email(email, verify_url)
    send_welcome_email(email, username)

    # Generate tokens
    access_token = create_access_token(identity=str(new_user.id))
    refresh_token = create_refresh_token(identity=str(new_user.id))

    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': new_user.to_dict(include_companies=True)
    }, 201


def google_login_user(google_token, ip_address=None):
    """Authenticate or register a user via Google OAuth ID token"""
    google_client_id = os.environ.get('GOOGLE_CLIENT_ID')
    if not google_client_id:
        return {'error': 'Google login is not configured'}, 500

    try:
        idinfo = id_token.verify_oauth2_token(
            google_token, google_requests.Request(), google_client_id
        )
    except ValueError as e:
        return {'error': f'Invalid Google token: {str(e)}'}, 401

    email = idinfo.get('email')
    name = idinfo.get('name', '')
    if not email:
        return {'error': 'Google account has no email'}, 400

    # Check if user already exists
    user = User.query.filter_by(email=email).first()

    if user:
        # Existing user — log them in
        user.last_login = datetime.utcnow()
        db.session.commit()
    else:
        # New user — register
        username = email.split('@')[0]
        # Ensure username uniqueness
        base_username = username
        counter = 1
        while User.query.filter_by(username=username).first():
            username = f'{base_username}{counter}'
            counter += 1

        # Generate a random password hash (user will only use Google login)
        random_password = hash_password(str(uuid.uuid4()))

        location = get_location_from_ip(ip_address) if ip_address else {'country': 'Unknown', 'city': 'Unknown'}

        user = User(
            username=username,
            email=email,
            password_hash=random_password,
            email_verified=True,  # Google already verified their email
            registration_ip=ip_address,
            registration_country=location.get('country'),
            registration_city=location.get('city')
        )
        db.session.add(user)
        db.session.flush()

        # Auto-assign companies by email domain
        _assign_companies_by_email_domain(user)
        db.session.commit()

    # Generate tokens
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user.to_dict(include_companies=True)
    }, 200


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
        'user': user.to_dict(include_companies=True)
    }, 200
