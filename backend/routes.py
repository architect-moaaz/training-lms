import os
import re
import io
import json
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import (db, User, UserProgress, UserProfile, Company, UserCompany, CompanyDayAccess,
                     Event, FreeResource, UserFreeResourceEnrollment,
                     CoursePackage, CoursePackageDay, CompanyPackageAccess,
                     CertificateTemplate, Certificate, PasswordResetToken,
                     Quiz, QuizQuestion, QuizAttempt,
                     Assignment, Submission, ContentItemProgress, Comment,
                     BadgeDefinition, UserBadge,
                     SubscriptionPlan, UserSubscription, PaymentLog,
                     get_accessible_days_for_user, get_public_days)
import csv
import stripe
from auth import register_user, login_user, google_login_user, hash_password
from email_service import send_password_reset_email, send_verification_email
from datetime import datetime
import secrets
from redis_kernel_manager import RedisKernelManager

api = Blueprint('api', __name__)



# Redis-based kernel manager (works across multiple Gunicorn workers)
kernel_manager = RedisKernelManager()


@api.route('/auth/register', methods=['POST'])
def register():
    """Register a new user
    ---
    tags: [Auth]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [username, email, password]
          properties:
            username: {type: string}
            email: {type: string}
            password: {type: string}
            invite_code: {type: string}
    responses:
      201: {description: Registration successful}
      400: {description: Validation error}
    """
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    invite_code = data.get('invite_code')

    # Get client IP address
    if request.headers.getlist("X-Forwarded-For"):
        ip_address = request.headers.getlist("X-Forwarded-For")[0]
    else:
        ip_address = request.remote_addr

    result, status_code = register_user(username, email, password, ip_address, invite_code=invite_code)
    return jsonify(result), status_code


@api.route('/auth/login', methods=['POST'])
def login():
    """Login a user
    ---
    tags: [Auth]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [emailOrUsername, password]
          properties:
            emailOrUsername: {type: string}
            password: {type: string}
    responses:
      200: {description: Login successful, returns JWT tokens}
      401: {description: Invalid credentials}
    """
    data = request.get_json()
    email_or_username = data.get('emailOrUsername') or data.get('email') or data.get('username')
    password = data.get('password')

    if not email_or_username or not password:
        return jsonify({'error': 'Email/username and password required'}), 400

    result, status_code = login_user(email_or_username, password)
    return jsonify(result), status_code


@api.route('/auth/google', methods=['POST'])
def google_login():
    """Login or register via Google OAuth
    ---
    tags: [Auth]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [credential]
          properties:
            credential: {type: string, description: Google OAuth ID token}
    responses:
      200: {description: Login successful}
      401: {description: Invalid token}
    """
    data = request.get_json()
    google_token = data.get('credential')
    if not google_token:
        return jsonify({'error': 'Google credential required'}), 400

    if request.headers.getlist("X-Forwarded-For"):
        ip_address = request.headers.getlist("X-Forwarded-For")[0]
    else:
        ip_address = request.remote_addr

    result, status_code = google_login_user(google_token, ip_address)
    return jsonify(result), status_code


@api.route('/auth/forgot-password', methods=['POST'])
def forgot_password():
    """Send password reset email. Always returns 200 to prevent user enumeration."""
    data = request.get_json()
    email = data.get('email', '').strip().lower()

    if not email:
        return jsonify({'message': 'If an account with that email exists, a reset link has been sent.'}), 200

    user = User.query.filter_by(email=email).first()
    if user:
        # Invalidate any existing unused tokens
        PasswordResetToken.query.filter_by(user_id=user.id, used=False).update({'used': True})

        token = PasswordResetToken(user_id=user.id)
        db.session.add(token)
        db.session.commit()

        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        reset_url = f"{frontend_url}/reset-password?token={token.token}"
        send_password_reset_email(user.email, reset_url)

    return jsonify({'message': 'If an account with that email exists, a reset link has been sent.'}), 200


@api.route('/auth/reset-password', methods=['POST'])
def reset_password():
    """Reset password using a valid token."""
    data = request.get_json()
    token_str = data.get('token', '')
    new_password = data.get('new_password', '')

    if not token_str or not new_password:
        return jsonify({'error': 'Token and new password are required'}), 400

    if len(new_password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    token = PasswordResetToken.query.filter_by(token=token_str).first()
    if not token or not token.is_valid:
        return jsonify({'error': 'Invalid or expired reset link. Please request a new one.'}), 400

    user = User.query.get(token.user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    user.password_hash = hash_password(new_password)
    token.used = True
    db.session.commit()

    return jsonify({'message': 'Password reset successfully. You can now log in with your new password.'}), 200


@api.route('/auth/verify-email/<token>', methods=['GET'])
def verify_email(token):
    """Verify a user's email address."""
    user = User.query.filter_by(email_verification_token=token).first()
    if not user:
        return jsonify({'error': 'Invalid verification link'}), 400

    user.email_verified = True
    user.email_verification_token = None
    db.session.commit()

    return jsonify({'message': 'Email verified successfully!'}), 200


@api.route('/auth/resend-verification', methods=['POST'])
@jwt_required()
def resend_verification():
    """Resend email verification link."""
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if not user:
        return jsonify({'error': 'User not found'}), 404

    if user.email_verified:
        return jsonify({'message': 'Email is already verified'}), 200

    token = secrets.token_urlsafe(32)
    user.email_verification_token = token
    db.session.commit()

    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    verify_url = f"{frontend_url}/verify-email?token={token}"
    send_verification_email(user.email, verify_url)

    return jsonify({'message': 'Verification email sent'}), 200


def _get_public_folder():
    """Get the public content folder path."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    public_folder = os.environ.get('PUBLIC_FOLDER', os.path.join(base_dir, 'public'))
    if not os.path.exists(public_folder):
        public_folder = os.path.join(os.path.dirname(base_dir), 'public')
    return public_folder


def _discover_day_folders():
    """Return a mapping {day_number: absolute_folder_path}.

    Discovery rules:
      1. Top-level `public/dayN/` folders — day_number from the folder name.
      2. Any other top-level folder is treated as a *course bucket* and is
         walked one level deep. Each sub-folder containing a `metadata.json`
         with a numeric `day_number` is registered. This lets nested courses
         (e.g. `public/student_course/module1_.../`) plug in without touching
         the existing `dayN` numbering.
    """
    public_folder = _get_public_folder()
    if not os.path.exists(public_folder):
        return {}

    mapping = {}
    for item in sorted(os.listdir(public_folder)):
        item_path = os.path.join(public_folder, item)
        if not os.path.isdir(item_path):
            continue

        # Case 1 — legacy top-level dayN folder.
        if item.startswith('day'):
            try:
                mapping[int(item.replace('day', ''))] = item_path
                continue
            except ValueError:
                pass  # fall through to bucket scan

        # Case 2 — course bucket, recurse one level for explicit day_number.
        try:
            sub_items = sorted(os.listdir(item_path))
        except OSError:
            continue
        for sub in sub_items:
            sub_path = os.path.join(item_path, sub)
            if not os.path.isdir(sub_path):
                continue
            meta_path = os.path.join(sub_path, 'metadata.json')
            if not os.path.exists(meta_path):
                continue
            try:
                with open(meta_path, 'r') as f:
                    meta = json.load(f)
            except (OSError, json.JSONDecodeError):
                continue
            n = meta.get('day_number')
            if isinstance(n, int):
                mapping[n] = sub_path
    return mapping


def _resolve_day_path(day_number):
    """Return the on-disk folder for a day_number, or None if unknown."""
    return _discover_day_folders().get(day_number)


def _scan_days(allowed_day_numbers=None):
    """Scan filesystem for day folders. If allowed_day_numbers is None, return all days.
    If it's a set, filter to only those days."""
    folders = _discover_day_folders()
    days = []
    for day_number in sorted(folders.keys()):
        if allowed_day_numbers is not None and day_number not in allowed_day_numbers:
            continue
        item_path = folders[day_number]

        notebooks = []
        pdfs = []
        for file in os.listdir(item_path):
            if file.endswith('.ipynb'):
                notebooks.append(file)
            elif file.endswith('.pdf'):
                pdfs.append(file)

        metadata_path = os.path.join(item_path, 'metadata.json')
        metadata = {}
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)

        videos = metadata.get('videos', [])

        days.append({
            'day_number': day_number,
            'title': metadata.get('title', f'Day {day_number}'),
            'description': metadata.get('description', ''),
            'notebooks': len(notebooks),
            'pdfs': len(pdfs),
            'videos': len(videos),
            'total_resources': len(notebooks) + len(pdfs) + len(videos),
            'level': metadata.get('level', ''),
        })
    return days


@api.route('/public/days', methods=['GET'])
def get_public_days_list():
    """Get publicly browsable days (no auth required)"""
    public_day_numbers = get_public_days()
    if not public_day_numbers:
        return jsonify({'days': []}), 200
    days = _scan_days(allowed_day_numbers=public_day_numbers)
    return jsonify({'days': days}), 200


@api.route('/days', methods=['GET'])
@jwt_required()
def get_days():
    """Get all available days with content metadata
    ---
    tags: [Content]
    security: [{Bearer: []}]
    responses:
      200: {description: List of accessible days}
    """
    user_id = int(get_jwt_identity())
    accessible_days = get_accessible_days_for_user(user_id)
    days = _scan_days(allowed_day_numbers=accessible_days)
    return jsonify({'days': days}), 200


def _check_day_access(user_id, day_number):
    """Check if a user has access to a specific day. Returns error response or None."""
    accessible_days = get_accessible_days_for_user(user_id)
    if accessible_days is not None and day_number not in accessible_days:
        return jsonify({'error': 'Access denied. Your company does not have access to this content.'}), 403
    return None


def _auto_track_progress(user_id, day_number):
    """Auto-create progress record when user accesses content."""
    progress = UserProgress.query.filter_by(user_id=user_id, day_number=day_number).first()
    if not progress:
        progress = UserProgress(user_id=user_id, day_number=day_number)
        db.session.add(progress)
    progress.last_accessed = datetime.utcnow()
    db.session.commit()


@api.route('/days/<int:day_number>/content', methods=['GET'])
@jwt_required()
def get_day_content(day_number):
    """Get content for a specific day
    ---
    tags: [Content]
    security: [{Bearer: []}]
    parameters:
      - in: path
        name: day_number
        type: integer
        required: true
    responses:
      200: {description: Day content with notebooks, PDFs, videos}
      403: {description: Access denied}
      404: {description: Day not found}
    """
    user_id = int(get_jwt_identity())
    access_error = _check_day_access(user_id, day_number)
    if access_error:
        return access_error

    day_folder = _resolve_day_path(day_number)
    if not day_folder or not os.path.exists(day_folder):
        return jsonify({'error': 'Day not found'}), 404

    # Auto-track progress on content access
    _auto_track_progress(user_id, day_number)

    notebooks = []
    pdfs = []

    for file in os.listdir(day_folder):
        if file.endswith('.ipynb'):
            notebooks.append({
                'filename': file,
                'name': file.replace('.ipynb', '').replace('_', ' ').title(),
                'type': 'notebook'
            })
        elif file.endswith('.pdf'):
            pdfs.append({
                'filename': file,
                'name': file.replace('.pdf', '').replace('_', ' ').title(),
                'type': 'pdf'
            })

    metadata_path = os.path.join(day_folder, 'metadata.json')
    metadata = {}
    if os.path.exists(metadata_path):
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)

    videos = metadata.get('videos', [])

    return jsonify({
        'day_number': day_number,
        'title': metadata.get('title', f'Day {day_number}'),
        'description': metadata.get('description', ''),
        'level': metadata.get('level', ''),
        'notebooks': notebooks,
        'pdfs': pdfs,
        'videos': videos
    }), 200


@api.route('/days/<int:day_number>/notebook/<filename>', methods=['GET'])
@jwt_required()
def get_notebook(day_number, filename):
    """Get notebook content"""
    user_id = int(get_jwt_identity())
    access_error = _check_day_access(user_id, day_number)
    if access_error:
        return access_error

    # Security: validate filename to prevent directory traversal
    if not filename.endswith('.ipynb') or '/' in filename or '\\' in filename:
        return jsonify({'error': 'Invalid filename'}), 400

    day_folder = _resolve_day_path(day_number)
    if not day_folder:
        return jsonify({'error': 'Day not found'}), 404
    notebook_path = os.path.join(day_folder, filename)
    if not os.path.exists(notebook_path):
        return jsonify({'error': 'Notebook not found'}), 404

    with open(notebook_path, 'r', encoding='utf-8') as f:
        notebook_content = json.load(f)

    return jsonify(notebook_content), 200


@api.route('/days/<int:day_number>/pdf/<filename>', methods=['GET'])
@jwt_required()
def get_pdf(day_number, filename):
    """Stream PDF file"""
    user_id = int(get_jwt_identity())
    access_error = _check_day_access(user_id, day_number)
    if access_error:
        return access_error

    # Security: validate filename to prevent directory traversal
    if not filename.endswith('.pdf') or '/' in filename or '\\' in filename:
        return jsonify({'error': 'Invalid filename'}), 400

    day_folder = _resolve_day_path(day_number)
    if not day_folder:
        return jsonify({'error': 'Day not found'}), 404
    pdf_path = os.path.join(day_folder, filename)
    if not os.path.exists(pdf_path):
        return jsonify({'error': 'PDF not found'}), 404

    return send_file(pdf_path, mimetype='application/pdf')


@api.route('/progress', methods=['GET'])
@jwt_required()
def get_progress():
    """Get user's progress across all days
    ---
    tags: [Progress]
    security: [{Bearer: []}]
    responses:
      200: {description: Array of progress records}
    """
    user_id = int(get_jwt_identity())

    progress = UserProgress.query.filter_by(user_id=user_id).all()

    return jsonify({
        'progress': [p.to_dict() for p in progress]
    }), 200


@api.route('/progress/<int:day_number>', methods=['POST'])
@jwt_required()
def update_progress(day_number):
    """Update progress for a specific day"""
    user_id = int(get_jwt_identity())
    data = request.get_json()

    # Find or create progress record
    progress = UserProgress.query.filter_by(
        user_id=user_id,
        day_number=day_number
    ).first()

    if not progress:
        progress = UserProgress(
            user_id=user_id,
            day_number=day_number
        )
        db.session.add(progress)

    # Update fields
    if 'completed' in data:
        progress.completed = data['completed']

    if 'time_spent' in data:
        progress.time_spent = data['time_spent']

    progress.last_accessed = datetime.utcnow()

    db.session.commit()

    return jsonify(progress.to_dict()), 200


@api.route('/user/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user info
    ---
    tags: [User]
    security: [{Bearer: []}]
    responses:
      200: {description: Current user with profile and companies}
      404: {description: User not found}
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify(user.to_dict(include_companies=True, include_profile=True)), 200


@api.route('/user/onboarding', methods=['POST'])
@jwt_required()
def submit_onboarding():
    """Submit onboarding profile"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    if not data.get('full_name'):
        return jsonify({'error': 'Full name is required'}), 400

    # Create or update profile
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        profile = UserProfile(user_id=user_id)
        db.session.add(profile)

    for field in ['full_name', 'phone', 'organization', 'job_title', 'country', 'city',
                  'experience_level', 'how_did_you_hear', 'learning_goals', 'interests']:
        if field in data:
            setattr(profile, field, data[field])

    db.session.commit()
    return jsonify({'success': True, 'user': user.to_dict(include_companies=True, include_profile=True)}), 200


@api.route('/user/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile (post-onboarding edits)"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    profile = UserProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        return jsonify({'error': 'Complete onboarding first'}), 400

    data = request.get_json()
    for field in ['full_name', 'phone', 'organization', 'job_title', 'country', 'city',
                  'experience_level', 'how_did_you_hear', 'learning_goals', 'interests']:
        if field in data:
            setattr(profile, field, data[field])

    db.session.commit()
    return jsonify({'success': True, 'user': user.to_dict(include_companies=True, include_profile=True)}), 200


# --- Admin Content Management ---

@api.route('/admin/content/days', methods=['GET'])
@jwt_required()
def admin_list_content_days():
    """List all day folders with their files"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403

    public_folder = _get_public_folder()
    if not os.path.exists(public_folder):
        return jsonify({'days': []}), 200

    days = []
    for item in sorted(os.listdir(public_folder)):
        item_path = os.path.join(public_folder, item)
        if os.path.isdir(item_path) and item.startswith('day'):
            try:
                day_number = int(item.replace('day', ''))
            except ValueError:
                continue

            files = []
            for f in sorted(os.listdir(item_path)):
                if f == 'metadata.json':
                    continue
                fpath = os.path.join(item_path, f)
                if os.path.isfile(fpath):
                    files.append({
                        'name': f,
                        'size': os.path.getsize(fpath),
                        'type': 'notebook' if f.endswith('.ipynb') else 'pdf' if f.endswith('.pdf') else 'other',
                    })

            metadata = {}
            meta_path = os.path.join(item_path, 'metadata.json')
            if os.path.exists(meta_path):
                with open(meta_path, 'r') as mf:
                    metadata = json.load(mf)

            days.append({
                'day_number': day_number,
                'folder': item,
                'title': metadata.get('title', f'Day {day_number}'),
                'description': metadata.get('description', ''),
                'files': files,
                'metadata': metadata,
            })

    return jsonify({'days': days}), 200


@api.route('/admin/content/days/<int:day_number>/upload', methods=['POST'])
@jwt_required()
def admin_upload_content(day_number):
    """Upload files to a day folder"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if not file.filename:
        return jsonify({'error': 'No file selected'}), 400

    # Validate file extension
    allowed_extensions = {'.ipynb', '.pdf'}
    _, ext = os.path.splitext(file.filename.lower())
    if ext not in allowed_extensions:
        return jsonify({'error': f'Only .ipynb and .pdf files are allowed, got {ext}'}), 400

    from werkzeug.utils import secure_filename
    filename = secure_filename(file.filename)
    if not filename:
        return jsonify({'error': 'Invalid filename'}), 400

    # Resolve existing folder (handles nested modules); fall back to creating
    # a fresh top-level dayN/ when this is a brand-new day_number.
    day_folder = _resolve_day_path(day_number)
    if not day_folder:
        day_folder = os.path.join(_get_public_folder(), f'day{day_number}')
    os.makedirs(day_folder, exist_ok=True)

    filepath = os.path.join(day_folder, filename)
    file.save(filepath)

    return jsonify({'message': f'File {filename} uploaded successfully', 'filename': filename}), 201


@api.route('/admin/content/days/<int:day_number>/files/<filename>', methods=['DELETE'])
@jwt_required()
def admin_delete_content_file(day_number, filename):
    """Delete a file from a day folder"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403

    # Path traversal check
    if '/' in filename or '\\' in filename or '..' in filename:
        return jsonify({'error': 'Invalid filename'}), 400

    day_folder = _resolve_day_path(day_number)
    if not day_folder:
        return jsonify({'error': 'Day not found'}), 404
    filepath = os.path.join(day_folder, filename)
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404

    os.remove(filepath)
    return jsonify({'message': f'File {filename} deleted'}), 200


@api.route('/admin/content/days/<int:day_number>/metadata', methods=['PUT'])
@jwt_required()
def admin_update_metadata(day_number):
    """Update a day's metadata.json"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403

    data = request.get_json()
    day_folder = _resolve_day_path(day_number)
    if not day_folder:
        day_folder = os.path.join(_get_public_folder(), f'day{day_number}')
    os.makedirs(day_folder, exist_ok=True)

    meta_path = os.path.join(day_folder, 'metadata.json')
    existing = {}
    if os.path.exists(meta_path):
        with open(meta_path, 'r') as f:
            existing = json.load(f)

    # Update fields
    for key in ['title', 'description', 'level', 'videos']:
        if key in data:
            existing[key] = data[key]

    with open(meta_path, 'w') as f:
        json.dump(existing, f, indent=2)

    return jsonify({'message': 'Metadata updated', 'metadata': existing}), 200


@api.route('/execute/cell', methods=['POST'])
@jwt_required()
def execute_cell():
    """Execute a notebook cell on the server"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    code = data.get('code')

    if not code:
        return jsonify({'error': 'No code provided'}), 400

    # Get kernel for this user (Redis-managed)
    kernel = kernel_manager.get_kernel(user_id)

    print(f"Executing code for user {user_id}: {code[:50]}...")
    result = kernel.execute_cell(code)
    print(f"Execution result: {result.get('success')}")
    return jsonify(result), 200


@api.route('/execute/restart', methods=['POST'])
@jwt_required()
def restart_kernel():
    """Restart the Jupyter kernel to clear all state"""
    user_id = int(get_jwt_identity())

    try:
        kernel_manager.restart_kernel(user_id)
        return jsonify({'success': True, 'message': 'Kernel restarted successfully'}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ========== PAGE TIME TRACKING ==========

@api.route('/track/page', methods=['POST'])
@jwt_required()
def track_page_time():
    """Track time spent on a page"""
    from models import PageTimeTracking

    user_id = int(get_jwt_identity())
    data = request.get_json()

    page_url = data.get('page_url')
    page_title = data.get('page_title')
    time_spent = data.get('time_spent', 0)  # in seconds

    if not page_url:
        return jsonify({'error': 'page_url is required'}), 400

    # Find or create page tracking record
    tracking = PageTimeTracking.query.filter_by(
        user_id=user_id,
        page_url=page_url
    ).first()

    if tracking:
        tracking.time_spent += time_spent
        tracking.visit_count += 1
        tracking.last_visited = datetime.utcnow()
    else:
        tracking = PageTimeTracking(
            user_id=user_id,
            page_url=page_url,
            page_title=page_title,
            time_spent=time_spent
        )
        db.session.add(tracking)

    db.session.commit()

    return jsonify({'success': True, 'tracking': tracking.to_dict()}), 200


@api.route('/track/pages', methods=['GET'])
@jwt_required()
def get_user_page_tracking():
    """Get user's page tracking data"""
    from models import PageTimeTracking

    user_id = int(get_jwt_identity())

    tracking_data = PageTimeTracking.query.filter_by(user_id=user_id).all()

    return jsonify({
        'tracking': [t.to_dict() for t in tracking_data],
        'total_pages': len(tracking_data),
        'total_time': sum(t.time_spent for t in tracking_data)
    }), 200


# ========== ADMIN ROUTES ==========

def admin_required(fn):
    """Decorator to require admin privileges"""
    from functools import wraps

    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or not user.is_admin:
            return jsonify({'error': 'Admin privileges required'}), 403

        return fn(*args, **kwargs)
    return wrapper


@api.route('/admin/analytics', methods=['GET'])
@admin_required
def get_analytics():
    """Get platform analytics for admin dashboard"""
    from models import PageTimeTracking
    from collections import Counter

    users = User.query.all()
    profiles = UserProfile.query.all()
    total_users = len(users)
    onboarded_users = len(profiles)

    # Demographics from profiles
    countries = Counter(p.country for p in profiles if p.country)
    experience_levels = Counter(p.experience_level for p in profiles if p.experience_level)
    organizations = Counter(p.organization for p in profiles if p.organization)
    how_heard = Counter(p.how_did_you_hear for p in profiles if p.how_did_you_hear)
    interests_counter = Counter()
    for p in profiles:
        if p.interests:
            for interest in p.interests.split(','):
                interest = interest.strip()
                if interest:
                    interests_counter[interest] += 1

    # Registration over time (last 30 days)
    from datetime import timedelta
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_users = [u for u in users if u.created_at and u.created_at >= thirty_days_ago]
    registrations_by_date = Counter()
    for u in recent_users:
        registrations_by_date[u.created_at.strftime('%Y-%m-%d')] += 1

    # Activity stats
    all_progress = UserProgress.query.all()
    all_tracking = PageTimeTracking.query.all()
    total_time = sum(t.time_spent for t in all_tracking)
    completed_days = sum(1 for p in all_progress if p.completed)

    # Company distribution
    company_members = Counter()
    for uc in UserCompany.query.all():
        company = Company.query.get(uc.company_id)
        if company:
            company_members[company.name] += 1
    no_company_count = sum(1 for u in users if not u.companies)

    # Google vs email login (heuristic: users with GOOGLE_OAUTH password pattern)
    google_users = sum(1 for u in users if u.password_hash and u.password_hash.startswith('$2b$') and len(u.password_hash) > 50)

    return jsonify({
        'overview': {
            'total_users': total_users,
            'onboarded_users': onboarded_users,
            'onboarding_rate': round(onboarded_users / total_users * 100, 1) if total_users else 0,
            'total_time_spent': total_time,
            'completed_days_total': completed_days,
            'active_companies': Company.query.filter_by(is_active=True).count(),
            'free_resources_count': FreeResource.query.filter_by(is_active=True).count(),
        },
        'demographics': {
            'countries': dict(countries.most_common(20)),
            'experience_levels': dict(experience_levels),
            'organizations': dict(organizations.most_common(20)),
            'how_did_you_hear': dict(how_heard.most_common(10)),
            'interests': dict(interests_counter.most_common(15)),
        },
        'registrations_by_date': dict(sorted(registrations_by_date.items())),
        'company_distribution': {
            **dict(company_members.most_common(20)),
            'No Company': no_company_count,
        },
    }), 200


@api.route('/admin/users', methods=['GET'])
@admin_required
def get_all_users():
    """Get all users with detailed information (admin only)"""
    from models import PageTimeTracking

    company_id = request.args.get('company_id', type=int)

    if company_id:
        # Filter users by company
        user_ids = [uc.user_id for uc in UserCompany.query.filter_by(company_id=company_id).all()]
        users = User.query.filter(User.id.in_(user_ids)).all() if user_ids else []
    else:
        users = User.query.all()

    users_data = []
    for user in users:
        user_dict = user.to_dict(include_sensitive=True, include_companies=True, include_profile=True)

        # Add page tracking stats
        page_tracks = PageTimeTracking.query.filter_by(user_id=user.id).all()
        user_dict['total_pages_visited'] = len(page_tracks)
        user_dict['total_time_spent'] = sum(t.time_spent for t in page_tracks)

        # Add progress stats
        user_dict['total_days_progress'] = len(user.progress)
        user_dict['completed_days'] = sum(1 for p in user.progress if p.completed)

        users_data.append(user_dict)

    return jsonify({
        'users': users_data,
        'total_users': len(users_data)
    }), 200


@api.route('/admin/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user_details(user_id):
    """Get detailed information about a specific user (admin only)"""
    from models import PageTimeTracking

    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    user_dict = user.to_dict(include_sensitive=True, include_companies=True)

    # Get page tracking data
    page_tracks = PageTimeTracking.query.filter_by(user_id=user_id).all()
    user_dict['page_tracking'] = [t.to_dict() for t in page_tracks]
    user_dict['total_pages_visited'] = len(page_tracks)
    user_dict['total_time_spent'] = sum(t.time_spent for t in page_tracks)

    # Get progress data
    user_dict['progress'] = [p.to_dict() for p in user.progress]
    user_dict['total_days_progress'] = len(user.progress)
    user_dict['completed_days'] = sum(1 for p in user.progress if p.completed)

    return jsonify(user_dict), 200


@api.route('/admin/users/<int:user_id>/reset-password', methods=['POST'])
@admin_required
def admin_reset_password(user_id):
    """Reset a user's password (admin only)"""
    from auth import hash_password

    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    new_password = data.get('new_password')

    if not new_password or len(new_password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    user.password_hash = hash_password(new_password)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Password reset successfully'}), 200


@api.route('/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """Delete a user (admin only)"""
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Prevent self-deletion
    current_user_id = int(get_jwt_identity())
    if user_id == current_user_id:
        return jsonify({'error': 'Cannot delete your own account'}), 400

    db.session.delete(user)
    db.session.commit()

    return jsonify({'success': True, 'message': 'User deleted successfully'}), 200


# ========== ADMIN COMPANY ROUTES ==========

@api.route('/admin/companies', methods=['GET'])
@admin_required
def get_companies():
    """List all companies with member counts and accessible days"""
    companies = Company.query.all()
    return jsonify({
        'companies': [c.to_dict(include_access=True) for c in companies]
    }), 200


@api.route('/admin/companies', methods=['POST'])
@admin_required
def create_company():
    """Create a new company"""
    data = request.get_json()
    name = data.get('name')
    invite_code = data.get('invite_code')
    email_domains = data.get('email_domains', [])
    accessible_days = data.get('accessible_days', [])

    if not name:
        return jsonify({'error': 'Company name is required'}), 400
    if not invite_code:
        return jsonify({'error': 'Invite code is required'}), 400

    # Check uniqueness
    if Company.query.filter_by(name=name).first():
        return jsonify({'error': 'Company name already exists'}), 400
    if Company.query.filter_by(invite_code=invite_code).first():
        return jsonify({'error': 'Invite code already in use'}), 400

    slug = Company.generate_slug(name)
    # Ensure slug uniqueness
    base_slug = slug
    counter = 1
    while Company.query.filter_by(slug=slug).first():
        slug = f'{base_slug}-{counter}'
        counter += 1

    # email_domains can be a list or comma-separated string
    if isinstance(email_domains, list):
        email_domains_str = ','.join(d.strip().lower() for d in email_domains if d.strip())
    else:
        email_domains_str = email_domains

    company = Company(
        name=name,
        slug=slug,
        invite_code=invite_code,
        email_domains=email_domains_str,
    )
    db.session.add(company)
    db.session.flush()

    # Set accessible days
    for day_num in accessible_days:
        da = CompanyDayAccess(company_id=company.id, day_number=int(day_num))
        db.session.add(da)

    db.session.commit()

    return jsonify(company.to_dict(include_access=True)), 201


@api.route('/admin/companies/<int:company_id>', methods=['PUT'])
@admin_required
def update_company(company_id):
    """Update company details"""
    company = Company.query.get(company_id)
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    data = request.get_json()

    if 'name' in data:
        existing = Company.query.filter(Company.name == data['name'], Company.id != company_id).first()
        if existing:
            return jsonify({'error': 'Company name already exists'}), 400
        company.name = data['name']
        company.slug = Company.generate_slug(data['name'])
        # Ensure slug uniqueness
        base_slug = company.slug
        counter = 1
        while Company.query.filter(Company.slug == company.slug, Company.id != company_id).first():
            company.slug = f'{base_slug}-{counter}'
            counter += 1

    if 'invite_code' in data:
        existing = Company.query.filter(Company.invite_code == data['invite_code'], Company.id != company_id).first()
        if existing:
            return jsonify({'error': 'Invite code already in use'}), 400
        company.invite_code = data['invite_code']

    if 'email_domains' in data:
        domains = data['email_domains']
        if isinstance(domains, list):
            company.email_domains = ','.join(d.strip().lower() for d in domains if d.strip())
        else:
            company.email_domains = domains

    if 'is_active' in data:
        company.is_active = bool(data['is_active'])

    if 'is_public' in data:
        company.is_public = bool(data['is_public'])

    db.session.commit()

    return jsonify(company.to_dict(include_access=True)), 200


@api.route('/admin/companies/<int:company_id>', methods=['DELETE'])
@admin_required
def delete_company(company_id):
    """Delete a company (cascades memberships and access)"""
    company = Company.query.get(company_id)
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    db.session.delete(company)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Company deleted successfully'}), 200


@api.route('/admin/companies/<int:company_id>/access', methods=['PUT'])
@admin_required
def set_company_access(company_id):
    """Set accessible days for a company (replaces all existing)"""
    company = Company.query.get(company_id)
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    data = request.get_json()
    day_numbers = data.get('day_numbers', [])

    # Remove all existing access
    CompanyDayAccess.query.filter_by(company_id=company_id).delete()

    # Add new access
    for day_num in day_numbers:
        da = CompanyDayAccess(company_id=company_id, day_number=int(day_num))
        db.session.add(da)

    db.session.commit()

    return jsonify(company.to_dict(include_access=True)), 200


@api.route('/admin/companies/<int:company_id>/members', methods=['GET'])
@admin_required
def get_company_members(company_id):
    """List company members"""
    company = Company.query.get(company_id)
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    members = []
    for uc in company.members:
        user = uc.user
        if user:
            members.append({
                'user_id': user.id,
                'username': user.username,
                'email': user.email,
                'joined_at': uc.joined_at.isoformat() if uc.joined_at else None,
                'joined_via': uc.joined_via
            })

    return jsonify({'members': members}), 200


@api.route('/admin/companies/<int:company_id>/members', methods=['POST'])
@admin_required
def add_company_member(company_id):
    """Add a user to a company"""
    company = Company.query.get(company_id)
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    data = request.get_json()
    user_id = data.get('user_id')

    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    existing = UserCompany.query.filter_by(user_id=user_id, company_id=company_id).first()
    if existing:
        return jsonify({'error': 'User is already a member of this company'}), 400

    uc = UserCompany(user_id=user_id, company_id=company_id, joined_via='admin_assigned')
    db.session.add(uc)
    db.session.commit()

    return jsonify({'success': True, 'message': f'User {user.username} added to {company.name}'}), 201


@api.route('/admin/companies/<int:company_id>/members/<int:user_id>', methods=['DELETE'])
@admin_required
def remove_company_member(company_id, user_id):
    """Remove a user from a company"""
    uc = UserCompany.query.filter_by(user_id=user_id, company_id=company_id).first()
    if not uc:
        return jsonify({'error': 'Membership not found'}), 404

    db.session.delete(uc)
    db.session.commit()

    return jsonify({'success': True, 'message': 'User removed from company'}), 200


# ========== FREE RESOURCES ==========

@api.route('/public/events', methods=['GET'])
def get_public_events():
    """Get all active events (no auth required)"""
    events = Event.query.filter_by(is_active=True).order_by(Event.event_date.desc()).all()
    return jsonify({'events': [e.to_dict() for e in events]}), 200


@api.route('/public/free-resources', methods=['GET'])
def get_public_free_resources():
    """Get all active free resources (no auth required)"""
    resources = FreeResource.query.filter_by(is_active=True).order_by(FreeResource.sort_order, FreeResource.id).all()
    return jsonify({'resources': [r.to_dict() for r in resources]}), 200


@api.route('/admin/free-resources', methods=['GET'])
@admin_required
def get_all_free_resources():
    """List all free resources (admin)"""
    resources = FreeResource.query.order_by(FreeResource.sort_order, FreeResource.id).all()
    return jsonify({'resources': [r.to_dict() for r in resources]}), 200


@api.route('/admin/free-resources', methods=['POST'])
@admin_required
def create_free_resource():
    """Create a free resource"""
    data = request.get_json()
    if not data.get('title') or not data.get('url'):
        return jsonify({'error': 'Title and URL are required'}), 400

    resource = FreeResource(
        title=data['title'],
        description=data.get('description', ''),
        url=data['url'],
        duration=data.get('duration', ''),
        instructor=data.get('instructor', ''),
        level=data.get('level', ''),
        category=data.get('category', ''),
        thumbnail_url=data.get('thumbnail_url'),
        sort_order=data.get('sort_order', 0),
        is_active=data.get('is_active', True),
    )
    db.session.add(resource)
    db.session.commit()
    return jsonify(resource.to_dict()), 201


@api.route('/admin/free-resources/<int:resource_id>', methods=['PUT'])
@admin_required
def update_free_resource(resource_id):
    """Update a free resource"""
    resource = FreeResource.query.get(resource_id)
    if not resource:
        return jsonify({'error': 'Resource not found'}), 404

    data = request.get_json()
    for field in ['title', 'description', 'url', 'duration', 'instructor', 'level', 'category', 'thumbnail_url', 'sort_order', 'is_active']:
        if field in data:
            setattr(resource, field, data[field])

    db.session.commit()
    return jsonify(resource.to_dict()), 200


@api.route('/admin/free-resources/<int:resource_id>', methods=['DELETE'])
@admin_required
def delete_free_resource(resource_id):
    """Delete a free resource"""
    resource = FreeResource.query.get(resource_id)
    if not resource:
        return jsonify({'error': 'Resource not found'}), 404

    db.session.delete(resource)
    db.session.commit()
    return jsonify({'success': True}), 200


# ========== FREE RESOURCE ENROLLMENT ==========

@api.route('/free-resources/<int:resource_id>', methods=['GET'])
@jwt_required()
def get_free_resource(resource_id):
    """Get a single free resource and auto-enroll the user"""
    user_id = int(get_jwt_identity())
    resource = FreeResource.query.get(resource_id)
    if not resource or not resource.is_active:
        return jsonify({'error': 'Resource not found'}), 404

    # Auto-enroll
    enrollment = UserFreeResourceEnrollment.query.filter_by(user_id=user_id, resource_id=resource_id).first()
    if not enrollment:
        enrollment = UserFreeResourceEnrollment(user_id=user_id, resource_id=resource_id)
        db.session.add(enrollment)
    enrollment.last_accessed = datetime.utcnow()
    db.session.commit()

    return jsonify({
        'resource': resource.to_dict(),
        'enrollment': enrollment.to_dict(),
    }), 200


@api.route('/free-resources/my-enrollments', methods=['GET'])
@jwt_required()
def get_my_enrollments():
    """Get user's free resource enrollments"""
    user_id = int(get_jwt_identity())
    enrollments = UserFreeResourceEnrollment.query.filter_by(user_id=user_id).all()
    return jsonify({
        'enrollments': [e.to_dict() for e in enrollments],
    }), 200


@api.route('/free-resources/<int:resource_id>/complete', methods=['POST'])
@jwt_required()
def mark_resource_complete(resource_id):
    """Mark a free resource as completed"""
    user_id = int(get_jwt_identity())
    enrollment = UserFreeResourceEnrollment.query.filter_by(user_id=user_id, resource_id=resource_id).first()
    if not enrollment:
        return jsonify({'error': 'Not enrolled'}), 404

    enrollment.completed = not enrollment.completed
    db.session.commit()
    return jsonify(enrollment.to_dict()), 200


# ========== COURSE PACKAGES ==========

@api.route('/admin/packages', methods=['GET'])
@admin_required
def get_packages():
    """List all course packages"""
    packages = CoursePackage.query.all()
    return jsonify({'packages': [p.to_dict() for p in packages]}), 200


@api.route('/admin/packages', methods=['POST'])
@admin_required
def create_package():
    """Create a course package"""
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Package name is required'}), 400

    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    base_slug = slug
    counter = 1
    while CoursePackage.query.filter_by(slug=slug).first():
        slug = f'{base_slug}-{counter}'
        counter += 1

    package = CoursePackage(
        name=name, slug=slug,
        description=data.get('description', ''),
        is_active=data.get('is_active', True),
    )
    db.session.add(package)
    db.session.flush()

    for day_num in data.get('days', []):
        db.session.add(CoursePackageDay(package_id=package.id, day_number=int(day_num)))

    db.session.commit()
    return jsonify(package.to_dict()), 201


@api.route('/admin/packages/<int:package_id>', methods=['PUT'])
@admin_required
def update_package(package_id):
    """Update a course package"""
    package = CoursePackage.query.get(package_id)
    if not package:
        return jsonify({'error': 'Package not found'}), 404

    data = request.get_json()
    if 'name' in data:
        package.name = data['name']
    if 'description' in data:
        package.description = data['description']
    if 'is_active' in data:
        package.is_active = bool(data['is_active'])
    if 'days' in data:
        CoursePackageDay.query.filter_by(package_id=package_id).delete()
        for day_num in data['days']:
            db.session.add(CoursePackageDay(package_id=package_id, day_number=int(day_num)))

    db.session.commit()
    return jsonify(package.to_dict()), 200


@api.route('/admin/packages/<int:package_id>', methods=['DELETE'])
@admin_required
def delete_package(package_id):
    """Delete a course package"""
    package = CoursePackage.query.get(package_id)
    if not package:
        return jsonify({'error': 'Package not found'}), 404

    db.session.delete(package)
    db.session.commit()
    return jsonify({'success': True}), 200


@api.route('/admin/companies/<int:company_id>/packages', methods=['PUT'])
@admin_required
def set_company_packages(company_id):
    """Set packages for a company (replaces all existing)"""
    company = Company.query.get(company_id)
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    data = request.get_json()
    package_ids = data.get('package_ids', [])

    CompanyPackageAccess.query.filter_by(company_id=company_id).delete()
    for pid in package_ids:
        db.session.add(CompanyPackageAccess(company_id=company_id, package_id=int(pid)))

    db.session.commit()
    return jsonify(company.to_dict(include_access=True)), 200


# ========== CERTIFICATES ==========

def _check_and_issue_certificates(user_id):
    """Check all active templates and issue certificates if criteria met. Returns newly issued certs."""
    user = User.query.get(user_id)
    if not user:
        return []

    profile = UserProfile.query.filter_by(user_id=user_id).first()
    user_name = profile.full_name if profile else user.username

    templates = CertificateTemplate.query.filter_by(is_active=True).all()
    newly_issued = []

    for template in templates:
        # Skip if already issued
        if Certificate.query.filter_by(user_id=user_id, template_id=template.id).first():
            continue

        earned = False

        if template.trigger_type == 'package':
            # Check if all days in the package are completed
            try:
                package_id = int(template.trigger_value)
            except ValueError:
                continue
            package = CoursePackage.query.get(package_id)
            if package:
                required_days = {d.day_number for d in package.days}
                if required_days:
                    completed_days = {p.day_number for p in UserProgress.query.filter_by(user_id=user_id).all() if p.completed}
                    if required_days.issubset(completed_days):
                        earned = True

        elif template.trigger_type == 'category':
            # Check if all free resources in this category are completed
            category = template.trigger_value
            resources = FreeResource.query.filter_by(category=category, is_active=True).all()
            if resources:
                resource_ids = {r.id for r in resources}
                completed_ids = {e.resource_id for e in UserFreeResourceEnrollment.query.filter_by(user_id=user_id).all() if e.completed}
                if resource_ids.issubset(completed_ids):
                    earned = True

        elif template.trigger_type == 'level':
            # Check if all free resources at this level are completed
            level = template.trigger_value
            resources = FreeResource.query.filter_by(level=level, is_active=True).all()
            if resources:
                resource_ids = {r.id for r in resources}
                completed_ids = {e.resource_id for e in UserFreeResourceEnrollment.query.filter_by(user_id=user_id).all() if e.completed}
                if resource_ids.issubset(completed_ids):
                    earned = True

        if earned:
            cert = Certificate(
                user_id=user_id,
                template_id=template.id,
                user_name=user_name,
                certificate_title=template.name,
            )
            db.session.add(cert)
            newly_issued.append(cert)

    if newly_issued:
        db.session.commit()

    return newly_issued


@api.route('/certificates/check', methods=['POST'])
@jwt_required()
def check_certificates():
    """Check and issue any earned certificates for the current user"""
    user_id = int(get_jwt_identity())
    newly_issued = _check_and_issue_certificates(user_id)
    return jsonify({
        'newly_issued': [c.to_dict() for c in newly_issued],
        'count': len(newly_issued),
    }), 200


@api.route('/certificates/my', methods=['GET'])
@jwt_required()
def get_my_certificates():
    """Get all certificates for the current user"""
    user_id = int(get_jwt_identity())
    # Also check for new ones
    _check_and_issue_certificates(user_id)
    certs = Certificate.query.filter_by(user_id=user_id).order_by(Certificate.issued_at.desc()).all()
    return jsonify({'certificates': [c.to_dict() for c in certs]}), 200


@api.route('/certificates/<cert_id>/download', methods=['GET'])
@jwt_required()
def download_certificate(cert_id):
    """Download certificate PDF"""
    from certificate_pdf import generate_certificate_pdf

    cert = Certificate.query.filter_by(cert_id=cert_id).first()
    if not cert:
        return jsonify({'error': 'Certificate not found'}), 404

    # Only the certificate holder or admin can download
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if cert.user_id != user_id and not (user and user.is_admin):
        return jsonify({'error': 'Access denied'}), 403

    template = CertificateTemplate.query.get(cert.template_id)
    description = template.description if template else ''

    pdf_bytes = generate_certificate_pdf(
        user_name=cert.user_name,
        certificate_title=cert.certificate_title,
        cert_id=cert.cert_id,
        issued_date=cert.issued_at.strftime('%B %d, %Y') if cert.issued_at else '',
        description=description,
    )

    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'{cert.cert_id}.pdf',
    )


@api.route('/verify/<cert_id>', methods=['GET'])
def verify_certificate(cert_id):
    """Public certificate verification (no auth required)"""
    cert = Certificate.query.filter_by(cert_id=cert_id).first()
    if not cert:
        return jsonify({'error': 'Certificate not found', 'valid': False}), 404

    return jsonify({
        'valid': True,
        'cert_id': cert.cert_id,
        'user_name': cert.user_name,
        'certificate_title': cert.certificate_title,
        'issued_at': cert.issued_at.isoformat() if cert.issued_at else None,
    }), 200


# ========== ADMIN CERTIFICATE TEMPLATES ==========

@api.route('/admin/certificate-templates', methods=['GET'])
@admin_required
def get_certificate_templates():
    """List all certificate templates"""
    templates = CertificateTemplate.query.all()
    return jsonify({'templates': [t.to_dict() for t in templates]}), 200


@api.route('/admin/certificate-templates', methods=['POST'])
@admin_required
def create_certificate_template():
    """Create a certificate template"""
    data = request.get_json()
    if not data.get('name') or not data.get('trigger_type') or not data.get('trigger_value'):
        return jsonify({'error': 'Name, trigger_type, and trigger_value are required'}), 400

    template = CertificateTemplate(
        name=data['name'],
        description=data.get('description', ''),
        trigger_type=data['trigger_type'],
        trigger_value=str(data['trigger_value']),
        is_active=data.get('is_active', True),
    )
    db.session.add(template)
    db.session.commit()
    return jsonify(template.to_dict()), 201


@api.route('/admin/certificate-templates/<int:template_id>', methods=['PUT'])
@admin_required
def update_certificate_template(template_id):
    """Update a certificate template"""
    template = CertificateTemplate.query.get(template_id)
    if not template:
        return jsonify({'error': 'Template not found'}), 404

    data = request.get_json()
    for field in ['name', 'description', 'trigger_type', 'trigger_value', 'is_active']:
        if field in data:
            setattr(template, field, data[field] if field != 'trigger_value' else str(data[field]))

    db.session.commit()
    return jsonify(template.to_dict()), 200


@api.route('/admin/certificate-templates/<int:template_id>', methods=['DELETE'])
@admin_required
def delete_certificate_template(template_id):
    """Delete a certificate template"""
    template = CertificateTemplate.query.get(template_id)
    if not template:
        return jsonify({'error': 'Template not found'}), 404

    db.session.delete(template)
    db.session.commit()
    return jsonify({'success': True}), 200


@api.route('/admin/certificates', methods=['GET'])
@admin_required
def get_all_certificates():
    """List all issued certificates"""
    certs = Certificate.query.order_by(Certificate.issued_at.desc()).all()
    return jsonify({'certificates': [c.to_dict() for c in certs]}), 200


# ========== ADMIN EVENTS ==========

@api.route('/admin/events', methods=['GET'])
@admin_required
def get_admin_events():
    """List all events"""
    events = Event.query.order_by(Event.event_date.desc()).all()
    return jsonify({'events': [e.to_dict() for e in events]}), 200


@api.route('/admin/events', methods=['POST'])
@admin_required
def create_event():
    """Create an event"""
    data = request.get_json()
    if not data.get('title') or not data.get('event_date'):
        return jsonify({'error': 'Title and date are required'}), 400

    from datetime import date as date_type
    event = Event(
        title=data['title'],
        description=data.get('description', ''),
        event_date=date_type.fromisoformat(data['event_date']),
        location=data.get('location', ''),
        city=data.get('city', ''),
        attendees=data.get('attendees', ''),
        image_url=data.get('image_url'),
        linkedin_url=data.get('linkedin_url'),
        highlights=data.get('highlights', ''),
        event_type=data.get('event_type', 'workshop'),
        is_upcoming=data.get('is_upcoming', False),
        is_active=data.get('is_active', True),
        sort_order=data.get('sort_order', 0),
    )
    db.session.add(event)
    db.session.commit()
    return jsonify(event.to_dict()), 201


@api.route('/admin/events/<int:event_id>', methods=['PUT'])
@admin_required
def update_event(event_id):
    """Update an event"""
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    data = request.get_json()
    from datetime import date as date_type
    for field in ['title', 'description', 'location', 'city', 'attendees', 'image_url',
                  'linkedin_url', 'highlights', 'event_type', 'is_upcoming', 'is_active', 'sort_order']:
        if field in data:
            setattr(event, field, data[field])
    if 'event_date' in data:
        event.event_date = date_type.fromisoformat(data['event_date'])

    db.session.commit()
    return jsonify(event.to_dict()), 200


@api.route('/admin/events/<int:event_id>', methods=['DELETE'])
@admin_required
def delete_event(event_id):
    """Delete an event"""
    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    db.session.delete(event)
    db.session.commit()
    return jsonify({'success': True}), 200


# ── Quiz Management (Admin) ──

@api.route('/admin/quizzes', methods=['GET'])
@admin_required
def admin_list_quizzes():
    quizzes = Quiz.query.order_by(Quiz.day_number).all()
    return jsonify({'quizzes': [q.to_dict(include_answers=True) for q in quizzes]}), 200


@api.route('/admin/quizzes', methods=['POST'])
@admin_required
def admin_create_quiz():
    data = request.get_json()
    quiz = Quiz(
        day_number=data['day_number'],
        title=data['title'],
        description=data.get('description', ''),
        passing_score=data.get('passing_score', 70),
        time_limit_minutes=data.get('time_limit_minutes'),
    )
    db.session.add(quiz)
    db.session.flush()

    for i, q in enumerate(data.get('questions', [])):
        question = QuizQuestion(
            quiz_id=quiz.id,
            question_text=q['question_text'],
            question_type=q.get('question_type', 'multiple_choice'),
            options=json.dumps(q.get('options', [])),
            correct_answer=q['correct_answer'],
            points=q.get('points', 1),
            sort_order=i,
        )
        db.session.add(question)

    db.session.commit()
    return jsonify(quiz.to_dict(include_answers=True)), 201


@api.route('/admin/quizzes/<int:quiz_id>', methods=['PUT'])
@admin_required
def admin_update_quiz(quiz_id):
    quiz = Quiz.query.get(quiz_id)
    if not quiz:
        return jsonify({'error': 'Quiz not found'}), 404

    data = request.get_json()
    for field in ['title', 'description', 'passing_score', 'time_limit_minutes', 'is_active', 'day_number']:
        if field in data:
            setattr(quiz, field, data[field])

    if 'questions' in data:
        QuizQuestion.query.filter_by(quiz_id=quiz.id).delete()
        for i, q in enumerate(data['questions']):
            question = QuizQuestion(
                quiz_id=quiz.id,
                question_text=q['question_text'],
                question_type=q.get('question_type', 'multiple_choice'),
                options=json.dumps(q.get('options', [])),
                correct_answer=q['correct_answer'],
                points=q.get('points', 1),
                sort_order=i,
            )
            db.session.add(question)

    db.session.commit()
    return jsonify(quiz.to_dict(include_answers=True)), 200


@api.route('/admin/quizzes/<int:quiz_id>', methods=['DELETE'])
@admin_required
def admin_delete_quiz(quiz_id):
    quiz = Quiz.query.get(quiz_id)
    if not quiz:
        return jsonify({'error': 'Quiz not found'}), 404
    db.session.delete(quiz)
    db.session.commit()
    return jsonify({'success': True}), 200


@api.route('/admin/quizzes/<int:quiz_id>/attempts', methods=['GET'])
@admin_required
def admin_quiz_attempts(quiz_id):
    attempts = QuizAttempt.query.filter_by(quiz_id=quiz_id).order_by(QuizAttempt.completed_at.desc()).all()
    result = []
    for a in attempts:
        d = a.to_dict()
        d['username'] = a.user.username if a.user else 'Unknown'
        result.append(d)
    return jsonify({'attempts': result}), 200


# ── Quiz (Student) ──

@api.route('/days/<int:day_number>/quiz', methods=['GET'])
@jwt_required()
def get_day_quiz(day_number):
    user_id = int(get_jwt_identity())
    access_error = _check_day_access(user_id, day_number)
    if access_error:
        return access_error

    quiz = Quiz.query.filter_by(day_number=day_number, is_active=True).first()
    if not quiz:
        return jsonify({'quiz': None}), 200

    data = quiz.to_student_dict()

    # Include user's best attempt
    best = QuizAttempt.query.filter_by(user_id=user_id, quiz_id=quiz.id)\
        .order_by(QuizAttempt.score.desc()).first()
    data['best_attempt'] = best.to_dict() if best else None

    return jsonify({'quiz': data}), 200


@api.route('/quizzes/<int:quiz_id>/submit', methods=['POST'])
@jwt_required()
def submit_quiz(quiz_id):
    user_id = int(get_jwt_identity())
    quiz = Quiz.query.get(quiz_id)
    if not quiz or not quiz.is_active:
        return jsonify({'error': 'Quiz not found'}), 404

    data = request.get_json()
    answers = data.get('answers', {})  # {question_id: selected_answer}

    score = 0
    total = 0
    results = []
    for q in quiz.questions:
        total += q.points
        user_answer = answers.get(str(q.id), '')
        correct = user_answer.strip().lower() == q.correct_answer.strip().lower()
        if correct:
            score += q.points
        results.append({
            'question_id': q.id,
            'correct': correct,
            'correct_answer': q.correct_answer,
            'your_answer': user_answer,
        })

    percentage = round(score / total * 100) if total else 0
    passed = percentage >= quiz.passing_score

    attempt = QuizAttempt(
        user_id=user_id,
        quiz_id=quiz.id,
        score=score,
        total_points=total,
        passed=passed,
        answers=json.dumps(answers),
    )
    db.session.add(attempt)
    db.session.commit()

    return jsonify({
        'score': score,
        'total_points': total,
        'percentage': percentage,
        'passed': passed,
        'results': results,
        'attempt': attempt.to_dict(),
    }), 200


# ── Assignment Management (Admin) ──

@api.route('/admin/assignments', methods=['GET'])
@admin_required
def admin_list_assignments():
    assignments = Assignment.query.order_by(Assignment.day_number).all()
    return jsonify({'assignments': [a.to_dict() for a in assignments]}), 200


@api.route('/admin/assignments', methods=['POST'])
@admin_required
def admin_create_assignment():
    data = request.get_json()
    assignment = Assignment(
        day_number=data['day_number'],
        title=data['title'],
        description=data.get('description', ''),
        submission_type=data.get('submission_type', 'text'),
        max_file_size_mb=data.get('max_file_size_mb', 10),
    )
    db.session.add(assignment)
    db.session.commit()
    return jsonify(assignment.to_dict()), 201


@api.route('/admin/assignments/<int:assignment_id>', methods=['PUT'])
@admin_required
def admin_update_assignment(assignment_id):
    assignment = Assignment.query.get(assignment_id)
    if not assignment:
        return jsonify({'error': 'Assignment not found'}), 404

    data = request.get_json()
    for field in ['title', 'description', 'submission_type', 'max_file_size_mb', 'is_active', 'day_number']:
        if field in data:
            setattr(assignment, field, data[field])

    db.session.commit()
    return jsonify(assignment.to_dict()), 200


@api.route('/admin/assignments/<int:assignment_id>', methods=['DELETE'])
@admin_required
def admin_delete_assignment(assignment_id):
    assignment = Assignment.query.get(assignment_id)
    if not assignment:
        return jsonify({'error': 'Assignment not found'}), 404
    db.session.delete(assignment)
    db.session.commit()
    return jsonify({'success': True}), 200


@api.route('/admin/submissions', methods=['GET'])
@admin_required
def admin_list_submissions():
    subs = Submission.query.order_by(Submission.submitted_at.desc()).all()
    result = []
    for s in subs:
        d = s.to_dict()
        d['username'] = s.user.username if s.user else 'Unknown'
        d['assignment_title'] = s.assignment.title if s.assignment else 'Unknown'
        d['day_number'] = s.assignment.day_number if s.assignment else None
        result.append(d)
    return jsonify({'submissions': result}), 200


@api.route('/admin/submissions/<int:submission_id>/review', methods=['PUT'])
@admin_required
def admin_review_submission(submission_id):
    sub = Submission.query.get(submission_id)
    if not sub:
        return jsonify({'error': 'Submission not found'}), 404

    user_id = int(get_jwt_identity())
    data = request.get_json()
    sub.grade = data.get('grade', sub.grade)
    sub.feedback = data.get('feedback', sub.feedback)
    sub.status = 'reviewed'
    sub.reviewed_at = datetime.utcnow()
    sub.reviewed_by = user_id
    db.session.commit()
    return jsonify(sub.to_dict()), 200


# ── Assignment (Student) ──

@api.route('/days/<int:day_number>/assignment', methods=['GET'])
@jwt_required()
def get_day_assignment(day_number):
    user_id = int(get_jwt_identity())
    access_error = _check_day_access(user_id, day_number)
    if access_error:
        return access_error

    assignment = Assignment.query.filter_by(day_number=day_number, is_active=True).first()
    if not assignment:
        return jsonify({'assignment': None}), 200

    data = assignment.to_dict()
    sub = Submission.query.filter_by(user_id=user_id, assignment_id=assignment.id).first()
    data['my_submission'] = sub.to_dict() if sub else None
    return jsonify({'assignment': data}), 200


@api.route('/assignments/<int:assignment_id>/submit', methods=['POST'])
@jwt_required()
def submit_assignment(assignment_id):
    user_id = int(get_jwt_identity())
    assignment = Assignment.query.get(assignment_id)
    if not assignment or not assignment.is_active:
        return jsonify({'error': 'Assignment not found'}), 404

    existing = Submission.query.filter_by(user_id=user_id, assignment_id=assignment_id).first()
    if existing:
        return jsonify({'error': 'You have already submitted this assignment'}), 400

    text_content = request.form.get('text_content', '')
    file_path_saved = None
    file_name_saved = None

    if 'file' in request.files:
        file = request.files['file']
        if file.filename:
            from werkzeug.utils import secure_filename
            filename = secure_filename(file.filename)
            upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                      'uploads', 'submissions', str(assignment_id), str(user_id))
            os.makedirs(upload_dir, exist_ok=True)
            fpath = os.path.join(upload_dir, filename)
            file.save(fpath)
            file_path_saved = fpath
            file_name_saved = filename

    sub = Submission(
        user_id=user_id,
        assignment_id=assignment_id,
        text_content=text_content,
        file_path=file_path_saved,
        file_name=file_name_saved,
    )
    db.session.add(sub)
    db.session.commit()
    return jsonify(sub.to_dict()), 201


# ── Granular Progress ──

@api.route('/progress/<int:day_number>/items', methods=['GET'])
@jwt_required()
def get_item_progress(day_number):
    user_id = int(get_jwt_identity())
    items = ContentItemProgress.query.filter_by(user_id=user_id, day_number=day_number).all()
    return jsonify({'items': [i.to_dict() for i in items]}), 200


@api.route('/progress/<int:day_number>/item', methods=['POST'])
@jwt_required()
def update_item_progress(day_number):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    item_type = data.get('item_type')
    item_identifier = data.get('item_identifier')

    if not item_type or not item_identifier:
        return jsonify({'error': 'item_type and item_identifier required'}), 400

    item = ContentItemProgress.query.filter_by(
        user_id=user_id, day_number=day_number,
        item_type=item_type, item_identifier=item_identifier
    ).first()

    if not item:
        item = ContentItemProgress(
            user_id=user_id, day_number=day_number,
            item_type=item_type, item_identifier=item_identifier
        )
        db.session.add(item)

    if 'completed' in data:
        item.completed = data['completed']
    if 'progress_pct' in data:
        item.progress_pct = data['progress_pct']
    item.last_accessed = datetime.utcnow()

    db.session.commit()
    return jsonify(item.to_dict()), 200


# ── Comments / Discussion ──

@api.route('/days/<int:day_number>/comments', methods=['GET'])
@jwt_required()
def get_day_comments(day_number):
    comments = Comment.query.filter_by(day_number=day_number)\
        .order_by(Comment.created_at.asc()).all()
    return jsonify({'comments': [c.to_dict() for c in comments]}), 200


@api.route('/days/<int:day_number>/comments', methods=['POST'])
@jwt_required()
def create_comment(day_number):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'error': 'Comment cannot be empty'}), 400

    comment = Comment(
        user_id=user_id,
        day_number=day_number,
        parent_id=data.get('parent_id'),
        content=content,
    )
    db.session.add(comment)
    db.session.commit()
    return jsonify(comment.to_dict()), 201


@api.route('/comments/<int:comment_id>', methods=['PUT'])
@jwt_required()
def update_comment(comment_id):
    user_id = int(get_jwt_identity())
    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({'error': 'Comment not found'}), 404
    if comment.user_id != user_id:
        return jsonify({'error': 'Cannot edit another user\'s comment'}), 403

    data = request.get_json()
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'error': 'Comment cannot be empty'}), 400

    comment.content = content
    comment.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(comment.to_dict()), 200


@api.route('/comments/<int:comment_id>', methods=['DELETE'])
@jwt_required()
def delete_comment(comment_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({'error': 'Comment not found'}), 404
    if comment.user_id != user_id and not (user and user.is_admin):
        return jsonify({'error': 'Not authorized'}), 403

    comment.is_deleted = True
    comment.content = '[deleted]'
    db.session.commit()
    return jsonify({'success': True}), 200


# ── Search ──

@api.route('/search', methods=['GET'])
@jwt_required()
def search():
    user_id = int(get_jwt_identity())
    query = request.args.get('q', '').strip().lower()
    if not query or len(query) < 2:
        return jsonify({'days': [], 'resources': []}), 200

    accessible_days = get_accessible_days_for_user(user_id)

    # Search days via metadata
    day_results = []
    public_folder = _get_public_folder()
    if os.path.exists(public_folder):
        for item in sorted(os.listdir(public_folder)):
            item_path = os.path.join(public_folder, item)
            if not os.path.isdir(item_path) or not item.startswith('day'):
                continue
            try:
                day_num = int(item.replace('day', ''))
            except ValueError:
                continue
            if accessible_days is not None and day_num not in accessible_days:
                continue

            meta_path = os.path.join(item_path, 'metadata.json')
            title = f'Day {day_num}'
            description = ''
            if os.path.exists(meta_path):
                with open(meta_path, 'r') as f:
                    meta = json.load(f)
                    title = meta.get('title', title)
                    description = meta.get('description', '')

            if query in title.lower() or query in description.lower():
                day_results.append({
                    'day_number': day_num,
                    'title': title,
                    'description': description,
                    'type': 'day',
                })

    # Search free resources
    resource_results = []
    resources = FreeResource.query.all()
    for r in resources:
        searchable = f"{r.title} {r.description or ''} {r.instructor or ''} {r.category or ''}".lower()
        if query in searchable:
            resource_results.append({
                'id': r.id,
                'title': r.title,
                'description': r.description,
                'instructor': r.instructor,
                'type': 'resource',
            })

    return jsonify({
        'days': day_results[:10],
        'resources': resource_results[:10],
        'total': len(day_results) + len(resource_results),
    }), 200


# ── Analytics Export (#13) ──

@api.route('/admin/analytics/export', methods=['GET'])
@jwt_required()
def export_analytics():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403
    fmt = request.args.get('format', 'csv')
    from models import PageTimeTracking

    if fmt == 'csv':
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['ID', 'Username', 'Email', 'Country', 'City', 'Organization',
                         'Experience Level', 'Registered', 'Last Login',
                         'Days Completed', 'Total Time (min)', 'Email Verified'])

        users = User.query.all()
        for u in users:
            profile = UserProfile.query.filter_by(user_id=u.id).first()
            progress = UserProgress.query.filter_by(user_id=u.id).all()
            tracking = PageTimeTracking.query.filter_by(user_id=u.id).all()
            completed = sum(1 for p in progress if p.completed)
            total_time = sum(t.time_spent for t in tracking)
            writer.writerow([
                u.id, u.username, u.email,
                profile.country if profile else '',
                profile.city if profile else '',
                profile.organization if profile else '',
                profile.experience_level if profile else '',
                u.created_at.strftime('%Y-%m-%d') if u.created_at else '',
                u.last_login.strftime('%Y-%m-%d') if u.last_login else 'Never',
                completed,
                round(total_time / 60, 1),
                'Yes' if u.email_verified else 'No',
            ])

        output.seek(0)
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name='spark10k_analytics.csv'
        )

    return jsonify({'error': 'Unsupported format. Use ?format=csv'}), 400


# ── Recommendations (#14) ──

@api.route('/recommendations', methods=['GET'])
@jwt_required()
def get_recommendations():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'recommendations': []}), 200

    profile = UserProfile.query.filter_by(user_id=user_id).first()
    user_level = profile.experience_level if profile else ''

    accessible_days = get_accessible_days_for_user(user_id)
    completed_progress = UserProgress.query.filter_by(user_id=user_id).all()
    completed_set = {p.day_number for p in completed_progress if p.completed}
    started_set = {p.day_number for p in completed_progress}

    # Scan available days
    public_folder = _get_public_folder()
    available_days = []
    if os.path.exists(public_folder):
        for item in sorted(os.listdir(public_folder)):
            if not item.startswith('day') or not os.path.isdir(os.path.join(public_folder, item)):
                continue
            try:
                day_num = int(item.replace('day', ''))
            except ValueError:
                continue
            if accessible_days is not None and day_num not in accessible_days:
                continue

            meta_path = os.path.join(public_folder, item, 'metadata.json')
            title = f'Day {day_num}'
            description = ''
            level = ''
            if os.path.exists(meta_path):
                with open(meta_path, 'r') as f:
                    meta = json.load(f)
                    title = meta.get('title', title)
                    description = meta.get('description', '')
                    level = meta.get('level', '')

            available_days.append({
                'day_number': day_num,
                'title': title,
                'description': description,
                'level': level,
                'completed': day_num in completed_set,
                'started': day_num in started_set,
            })

    recommendations = []

    # 1. Continue where you left off (started but not completed)
    in_progress = [d for d in available_days if d['started'] and not d['completed']]
    for d in in_progress[:2]:
        recommendations.append({**d, 'reason': 'Continue where you left off'})

    # 2. Next sequential uncompleted day
    uncompleted = [d for d in available_days if not d['completed'] and not d['started']]
    for d in uncompleted[:2]:
        recommendations.append({**d, 'reason': 'Next in your learning path'})

    # 3. Level-matched content
    if user_level:
        level_matched = [d for d in uncompleted if d['level'] == user_level
                         and d['day_number'] not in {r['day_number'] for r in recommendations}]
        for d in level_matched[:2]:
            recommendations.append({**d, 'reason': f'Recommended for {user_level} level'})

    # 4. Unstarted free resources
    enrolled_ids = {e.resource_id for e in UserFreeResourceEnrollment.query.filter_by(user_id=user_id).all()}
    unstarted_resources = FreeResource.query.filter(
        FreeResource.is_active == True,
        ~FreeResource.id.in_(enrolled_ids) if enrolled_ids else True
    ).limit(3).all()
    for r in unstarted_resources:
        recommendations.append({
            'type': 'resource',
            'id': r.id,
            'title': r.title,
            'description': r.description,
            'level': r.level,
            'reason': 'Free course you haven\'t started',
        })

    return jsonify({'recommendations': recommendations[:8]}), 200


# ── Badges (#15) ──

def _check_and_award_badges(user_id):
    """Evaluate all active badges and award new ones. Returns newly awarded badges."""
    badges = BadgeDefinition.query.filter_by(is_active=True).all()
    existing = {ub.badge_id for ub in UserBadge.query.filter_by(user_id=user_id).all()}
    newly_awarded = []

    progress = UserProgress.query.filter_by(user_id=user_id).all()
    completed_days = sum(1 for p in progress if p.completed)
    quiz_attempts = QuizAttempt.query.filter_by(user_id=user_id).all()
    quizzes_passed = len({a.quiz_id for a in quiz_attempts if a.passed})

    from models import PageTimeTracking
    total_time_min = sum(t.time_spent for t in PageTimeTracking.query.filter_by(user_id=user_id).all()) / 60

    for badge in badges:
        if badge.id in existing:
            continue

        earned = False
        if badge.criteria_type == 'days_completed':
            earned = completed_days >= badge.criteria_value
        elif badge.criteria_type == 'quizzes_passed':
            earned = quizzes_passed >= badge.criteria_value
        elif badge.criteria_type == 'time_spent':
            earned = total_time_min >= badge.criteria_value
        elif badge.criteria_type == 'first_login':
            earned = True  # If user exists, they've logged in

        if earned:
            ub = UserBadge(user_id=user_id, badge_id=badge.id)
            db.session.add(ub)
            newly_awarded.append(badge.to_dict())

    if newly_awarded:
        db.session.commit()
    return newly_awarded


@api.route('/badges/my', methods=['GET'])
@jwt_required()
def get_my_badges():
    user_id = int(get_jwt_identity())
    # Check for new badges
    new_badges = _check_and_award_badges(user_id)
    # Return all
    user_badges = UserBadge.query.filter_by(user_id=user_id).order_by(UserBadge.earned_at.desc()).all()
    return jsonify({
        'badges': [ub.to_dict() for ub in user_badges],
        'new_badges': new_badges,
    }), 200


@api.route('/admin/badges', methods=['GET'])
@admin_required
def admin_list_badges():
    badges = BadgeDefinition.query.all()
    return jsonify({'badges': [b.to_dict() for b in badges]}), 200


@api.route('/admin/badges', methods=['POST'])
@admin_required
def admin_create_badge():
    data = request.get_json()
    badge = BadgeDefinition(
        name=data['name'],
        description=data.get('description', ''),
        icon=data.get('icon', 'award'),
        criteria_type=data['criteria_type'],
        criteria_value=data.get('criteria_value', 1),
    )
    db.session.add(badge)
    db.session.commit()
    return jsonify(badge.to_dict()), 201


@api.route('/admin/badges/<int:badge_id>', methods=['PUT'])
@admin_required
def admin_update_badge(badge_id):
    badge = BadgeDefinition.query.get(badge_id)
    if not badge:
        return jsonify({'error': 'Badge not found'}), 404
    data = request.get_json()
    for field in ['name', 'description', 'icon', 'criteria_type', 'criteria_value', 'is_active']:
        if field in data:
            setattr(badge, field, data[field])
    db.session.commit()
    return jsonify(badge.to_dict()), 200


@api.route('/admin/badges/<int:badge_id>', methods=['DELETE'])
@admin_required
def admin_delete_badge(badge_id):
    badge = BadgeDefinition.query.get(badge_id)
    if not badge:
        return jsonify({'error': 'Badge not found'}), 404
    db.session.delete(badge)
    db.session.commit()
    return jsonify({'success': True}), 200


# ── Payments / Subscriptions ──

def _init_stripe():
    stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')


@api.route('/public/plans', methods=['GET'])
def get_public_plans():
    """Get all active subscription plans (no auth required)"""
    plans = SubscriptionPlan.query.filter_by(is_active=True).order_by(SubscriptionPlan.price_cents).all()
    return jsonify({'plans': [p.to_dict() for p in plans]}), 200


@api.route('/payments/create-checkout', methods=['POST'])
@jwt_required()
def create_checkout():
    """Create a Stripe Checkout session"""
    _init_stripe()
    if not stripe.api_key:
        return jsonify({'error': 'Payment system not configured'}), 503

    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    plan_id = data.get('plan_id')
    plan = SubscriptionPlan.query.get(plan_id)
    if not plan or not plan.is_active:
        return jsonify({'error': 'Plan not found'}), 404

    if not plan.stripe_price_id:
        return jsonify({'error': 'Plan not configured for payments'}), 400

    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

    try:
        checkout_params = {
            'payment_method_types': ['card'],
            'line_items': [{'price': plan.stripe_price_id, 'quantity': 1}],
            'success_url': f"{frontend_url}/checkout-success?session_id={{CHECKOUT_SESSION_ID}}",
            'cancel_url': f"{frontend_url}/pricing",
            'client_reference_id': str(user_id),
            'metadata': {'plan_id': str(plan.id), 'user_id': str(user_id)},
        }

        if plan.billing_period in ('monthly', 'yearly'):
            checkout_params['mode'] = 'subscription'
        else:
            checkout_params['mode'] = 'payment'

        # Reuse or create Stripe customer
        existing_sub = UserSubscription.query.filter_by(user_id=user_id).first()
        if existing_sub and existing_sub.stripe_customer_id:
            checkout_params['customer'] = existing_sub.stripe_customer_id
        else:
            checkout_params['customer_email'] = user.email

        session = stripe.checkout.Session.create(**checkout_params)

        # Log
        log = PaymentLog(
            user_id=user_id,
            stripe_session_id=session.id,
            amount_cents=plan.price_cents,
            currency=plan.currency,
            status='pending',
        )
        db.session.add(log)
        db.session.commit()

        return jsonify({'checkout_url': session.url, 'session_id': session.id}), 200

    except stripe.error.StripeError as e:
        return jsonify({'error': str(e)}), 400


@api.route('/payments/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhook events (no JWT — uses Stripe signature)"""
    _init_stripe()
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get('Stripe-Signature')
    webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET', '')

    try:
        if webhook_secret:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        else:
            event = json.loads(payload)
    except (ValueError, stripe.error.SignatureVerificationError):
        return jsonify({'error': 'Invalid signature'}), 400

    event_type = event.get('type', '')
    data_obj = event.get('data', {}).get('object', {})

    if event_type == 'checkout.session.completed':
        session_id = data_obj.get('id')
        user_id = int(data_obj.get('metadata', {}).get('user_id', 0))
        plan_id = int(data_obj.get('metadata', {}).get('plan_id', 0))
        customer_id = data_obj.get('customer')
        subscription_id = data_obj.get('subscription')

        if user_id and plan_id:
            plan = SubscriptionPlan.query.get(plan_id)
            sub = UserSubscription(
                user_id=user_id,
                plan_id=plan_id,
                stripe_subscription_id=subscription_id,
                stripe_customer_id=customer_id,
                status='active',
                current_period_start=datetime.utcnow(),
            )
            db.session.add(sub)

            # Grant package access if plan has a package
            if plan and plan.package_id:
                existing = CompanyPackageAccess.query.filter_by(package_id=plan.package_id).first()
                if not existing:
                    # Grant all days in the package directly
                    pkg_days = CoursePackageDay.query.filter_by(package_id=plan.package_id).all()
                    for pd in pkg_days:
                        # Check user's companies and grant via first company, or create a direct progress record
                        pass  # Package access is handled via get_accessible_days_for_user

            # Update payment log
            PaymentLog.query.filter_by(stripe_session_id=session_id).update({'status': 'completed'})
            db.session.commit()

    elif event_type == 'customer.subscription.deleted':
        subscription_id = data_obj.get('id')
        sub = UserSubscription.query.filter_by(stripe_subscription_id=subscription_id).first()
        if sub:
            sub.status = 'cancelled'
            db.session.commit()

    elif event_type == 'invoice.payment_failed':
        subscription_id = data_obj.get('subscription')
        sub = UserSubscription.query.filter_by(stripe_subscription_id=subscription_id).first()
        if sub:
            sub.status = 'past_due'
            db.session.commit()

    return jsonify({'received': True}), 200


@api.route('/payments/my-subscriptions', methods=['GET'])
@jwt_required()
def get_my_subscriptions():
    user_id = int(get_jwt_identity())
    subs = UserSubscription.query.filter_by(user_id=user_id).order_by(UserSubscription.created_at.desc()).all()
    return jsonify({'subscriptions': [s.to_dict() for s in subs]}), 200


@api.route('/payments/cancel', methods=['POST'])
@jwt_required()
def cancel_subscription():
    _init_stripe()
    user_id = int(get_jwt_identity())
    data = request.get_json()
    sub_id = data.get('subscription_id')

    sub = UserSubscription.query.get(sub_id)
    if not sub or sub.user_id != user_id:
        return jsonify({'error': 'Subscription not found'}), 404

    if sub.stripe_subscription_id and stripe.api_key:
        try:
            stripe.Subscription.modify(sub.stripe_subscription_id, cancel_at_period_end=True)
        except stripe.error.StripeError as e:
            return jsonify({'error': str(e)}), 400

    sub.status = 'cancelled'
    db.session.commit()
    return jsonify({'message': 'Subscription cancelled', 'subscription': sub.to_dict()}), 200


# ── Admin Subscription Plans ──

@api.route('/admin/subscription-plans', methods=['GET'])
@admin_required
def admin_list_plans():
    plans = SubscriptionPlan.query.all()
    return jsonify({'plans': [p.to_dict() for p in plans]}), 200


@api.route('/admin/subscription-plans', methods=['POST'])
@admin_required
def admin_create_plan():
    data = request.get_json()
    plan = SubscriptionPlan(
        name=data['name'],
        description=data.get('description', ''),
        price_cents=data.get('price_cents', 0),
        currency=data.get('currency', 'inr'),
        billing_period=data.get('billing_period', 'monthly'),
        stripe_price_id=data.get('stripe_price_id', ''),
        package_id=data.get('package_id'),
        features=json.dumps(data.get('features', [])),
    )
    db.session.add(plan)
    db.session.commit()
    return jsonify(plan.to_dict()), 201


@api.route('/admin/subscription-plans/<int:plan_id>', methods=['PUT'])
@admin_required
def admin_update_plan(plan_id):
    plan = SubscriptionPlan.query.get(plan_id)
    if not plan:
        return jsonify({'error': 'Plan not found'}), 404
    data = request.get_json()
    for field in ['name', 'description', 'price_cents', 'currency', 'billing_period',
                  'stripe_price_id', 'package_id', 'is_active']:
        if field in data:
            setattr(plan, field, data[field])
    if 'features' in data:
        plan.features = json.dumps(data['features'])
    db.session.commit()
    return jsonify(plan.to_dict()), 200


@api.route('/admin/subscription-plans/<int:plan_id>', methods=['DELETE'])
@admin_required
def admin_delete_plan(plan_id):
    plan = SubscriptionPlan.query.get(plan_id)
    if not plan:
        return jsonify({'error': 'Plan not found'}), 404
    db.session.delete(plan)
    db.session.commit()
    return jsonify({'success': True}), 200
