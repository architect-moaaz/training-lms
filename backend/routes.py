import os
import re
import io
import json
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import (db, User, UserProgress, UserProfile, Company, UserCompany, CompanyDayAccess,
                     Event, FreeResource, UserFreeResourceEnrollment,
                     CoursePackage, CoursePackageDay, CompanyPackageAccess,
                     CertificateTemplate, Certificate,
                     get_accessible_days_for_user, get_public_days)
from auth import register_user, login_user, google_login_user
from datetime import datetime
from redis_kernel_manager import RedisKernelManager

api = Blueprint('api', __name__)

# Redis-based kernel manager (works across multiple Gunicorn workers)
kernel_manager = RedisKernelManager()


@api.route('/auth/register', methods=['POST'])
def register():
    """Register a new user"""
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
    """Login a user"""
    data = request.get_json()
    email_or_username = data.get('emailOrUsername') or data.get('email') or data.get('username')
    password = data.get('password')

    if not email_or_username or not password:
        return jsonify({'error': 'Email/username and password required'}), 400

    result, status_code = login_user(email_or_username, password)
    return jsonify(result), status_code


@api.route('/auth/google', methods=['POST'])
def google_login():
    """Login or register via Google OAuth"""
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


def _get_public_folder():
    """Get the public content folder path."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    public_folder = os.environ.get('PUBLIC_FOLDER', os.path.join(base_dir, 'public'))
    if not os.path.exists(public_folder):
        public_folder = os.path.join(os.path.dirname(base_dir), 'public')
    return public_folder


def _scan_days(allowed_day_numbers=None):
    """Scan filesystem for day folders. If allowed_day_numbers is None, return all days.
    If it's a set, filter to only those days."""
    public_folder = _get_public_folder()
    if not os.path.exists(public_folder):
        return []

    days = []
    for item in sorted(os.listdir(public_folder)):
        item_path = os.path.join(public_folder, item)
        if os.path.isdir(item_path) and item.startswith('day'):
            try:
                day_number = int(item.replace('day', ''))
            except ValueError:
                continue

            if allowed_day_numbers is not None and day_number not in allowed_day_numbers:
                continue

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
    """Get all available days with content metadata"""
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
    """Get content for a specific day"""
    user_id = int(get_jwt_identity())
    access_error = _check_day_access(user_id, day_number)
    if access_error:
        return access_error

    public_folder = _get_public_folder()
    day_folder = os.path.join(public_folder, f'day{day_number}')

    if not os.path.exists(day_folder):
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

    public_folder = _get_public_folder()
    notebook_path = os.path.join(public_folder, f'day{day_number}', filename)

    # Security: validate filename to prevent directory traversal
    if not filename.endswith('.ipynb') or '/' in filename or '\\' in filename:
        return jsonify({'error': 'Invalid filename'}), 400

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

    public_folder = _get_public_folder()
    pdf_path = os.path.join(public_folder, f'day{day_number}', filename)

    # Security: validate filename to prevent directory traversal
    if not filename.endswith('.pdf') or '/' in filename or '\\' in filename:
        return jsonify({'error': 'Invalid filename'}), 400

    if not os.path.exists(pdf_path):
        return jsonify({'error': 'PDF not found'}), 404

    return send_file(pdf_path, mimetype='application/pdf')


@api.route('/progress', methods=['GET'])
@jwt_required()
def get_progress():
    """Get user's progress across all days"""
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
    """Get current user info"""
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
