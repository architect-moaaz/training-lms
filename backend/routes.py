import os
import json
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, UserProgress
from auth import register_user, login_user
from datetime import datetime
from notebook_executor import NotebookExecutor

api = Blueprint('api', __name__)
notebook_executor = NotebookExecutor()


@api.route('/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    # Get client IP address
    if request.headers.getlist("X-Forwarded-For"):
        ip_address = request.headers.getlist("X-Forwarded-For")[0]
    else:
        ip_address = request.remote_addr

    result, status_code = register_user(username, email, password, ip_address)
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


@api.route('/days/<int:day_number>/content', methods=['GET'])
@jwt_required()
def get_day_content(day_number):
    """Get content for a specific day"""
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

    return jsonify(user.to_dict()), 200


@api.route('/execute/cell', methods=['POST'])
@jwt_required()
def execute_cell():
    """Execute a notebook cell on the server"""
    data = request.get_json()
    code = data.get('code')

    if not code:
        return jsonify({'error': 'No code provided'}), 400

    result = notebook_executor.execute_cell(code)
    return jsonify(result), 200


@api.route('/execute/restart', methods=['POST'])
@jwt_required()
def restart_kernel():
    """Restart the Jupyter kernel to clear all state"""
    try:
        notebook_executor.restart_kernel()
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

def admin_required():
    """Decorator to require admin privileges"""
    def wrapper(fn):
        @jwt_required()
        def decorator(*args, **kwargs):
            user_id = int(get_jwt_identity())
            user = User.query.get(user_id)

            if not user or not user.is_admin:
                return jsonify({'error': 'Admin privileges required'}), 403

            return fn(*args, **kwargs)
        decorator.__name__ = fn.__name__
        return decorator
    return wrapper


@api.route('/admin/users', methods=['GET'])
@admin_required()
def get_all_users():
    """Get all users with detailed information (admin only)"""
    from models import PageTimeTracking

    users = User.query.all()

    users_data = []
    for user in users:
        user_dict = user.to_dict(include_sensitive=True)

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
@admin_required()
def get_user_details(user_id):
    """Get detailed information about a specific user (admin only)"""
    from models import PageTimeTracking

    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    user_dict = user.to_dict(include_sensitive=True)

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
@admin_required()
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
@admin_required()
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
