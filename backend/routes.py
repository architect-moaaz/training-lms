import os
import json
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, UserProgress, Company, UserCompany, CompanyDayAccess, get_accessible_days_for_user
from auth import register_user, login_user
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


@api.route('/days', methods=['GET'])
@jwt_required()
def get_days():
    """Get all available days with content metadata"""
    user_id = int(get_jwt_identity())
    accessible_days = get_accessible_days_for_user(user_id)

    # Check if running in Railway (use local public folder) or locally (use parent public folder)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    public_folder = os.environ.get('PUBLIC_FOLDER', os.path.join(base_dir, 'public'))

    # Fallback to parent directory public folder if local one doesn't exist
    if not os.path.exists(public_folder):
        public_folder = os.path.join(os.path.dirname(base_dir), 'public')

    if not os.path.exists(public_folder):
        return jsonify({'error': 'Content not available'}), 404

    days = []

    # Scan for day folders
    for item in sorted(os.listdir(public_folder)):
        item_path = os.path.join(public_folder, item)

        if os.path.isdir(item_path) and item.startswith('day'):
            try:
                day_number = int(item.replace('day', ''))
            except ValueError:
                continue

            # Filter by accessible days (None means admin - all access)
            if accessible_days is not None and day_number not in accessible_days:
                continue

            # Get content files
            notebooks = []
            pdfs = []

            for file in os.listdir(item_path):
                if file.endswith('.ipynb'):
                    notebooks.append(file)
                elif file.endswith('.pdf'):
                    pdfs.append(file)

            # Load metadata if exists
            metadata_path = os.path.join(item_path, 'metadata.json')
            metadata = {}
            if os.path.exists(metadata_path):
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)

            days.append({
                'day_number': day_number,
                'title': metadata.get('title', f'Day {day_number}'),
                'description': metadata.get('description', ''),
                'notebooks': len(notebooks),
                'pdfs': len(pdfs),
                'total_resources': len(notebooks) + len(pdfs)
            })

    return jsonify({'days': days}), 200


def _check_day_access(user_id, day_number):
    """Check if a user has access to a specific day. Returns error response or None."""
    accessible_days = get_accessible_days_for_user(user_id)
    if accessible_days is not None and day_number not in accessible_days:
        return jsonify({'error': 'Access denied. Your company does not have access to this content.'}), 403
    return None


@api.route('/days/<int:day_number>/content', methods=['GET'])
@jwt_required()
def get_day_content(day_number):
    """Get content for a specific day"""
    user_id = int(get_jwt_identity())
    access_error = _check_day_access(user_id, day_number)
    if access_error:
        return access_error

    base_dir = os.path.dirname(os.path.abspath(__file__))
    public_folder = os.environ.get('PUBLIC_FOLDER', os.path.join(base_dir, 'public'))
    if not os.path.exists(public_folder):
        public_folder = os.path.join(os.path.dirname(base_dir), 'public')

    day_folder = os.path.join(public_folder, f'day{day_number}')

    if not os.path.exists(day_folder):
        return jsonify({'error': 'Day not found'}), 404

    notebooks = []
    pdfs = []

    for file in os.listdir(day_folder):
        file_path = os.path.join(day_folder, file)

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

    # Load metadata if exists
    metadata_path = os.path.join(day_folder, 'metadata.json')
    metadata = {}
    if os.path.exists(metadata_path):
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)

    return jsonify({
        'day_number': day_number,
        'title': metadata.get('title', f'Day {day_number}'),
        'description': metadata.get('description', ''),
        'notebooks': notebooks,
        'pdfs': pdfs
    }), 200


@api.route('/days/<int:day_number>/notebook/<filename>', methods=['GET'])
@jwt_required()
def get_notebook(day_number, filename):
    """Get notebook content"""
    user_id = int(get_jwt_identity())
    access_error = _check_day_access(user_id, day_number)
    if access_error:
        return access_error

    base_dir = os.path.dirname(os.path.abspath(__file__))
    public_folder = os.environ.get('PUBLIC_FOLDER', os.path.join(base_dir, 'public'))
    if not os.path.exists(public_folder):
        public_folder = os.path.join(os.path.dirname(base_dir), 'public')

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

    base_dir = os.path.dirname(os.path.abspath(__file__))
    public_folder = os.environ.get('PUBLIC_FOLDER', os.path.join(base_dir, 'public'))
    if not os.path.exists(public_folder):
        public_folder = os.path.join(os.path.dirname(base_dir), 'public')

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

    return jsonify(user.to_dict(include_companies=True)), 200


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
        user_dict = user.to_dict(include_sensitive=True, include_companies=True)

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
