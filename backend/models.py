import re
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)

    # Location tracking
    registration_ip = db.Column(db.String(45))  # IPv6 max length
    registration_country = db.Column(db.String(100))
    registration_city = db.Column(db.String(100))

    progress = db.relationship('UserProgress', backref='user', lazy=True, cascade='all, delete-orphan')
    page_tracking = db.relationship('PageTimeTracking', backref='user', lazy=True, cascade='all, delete-orphan')
    companies = db.relationship('UserCompany', backref='user', lazy=True, cascade='all, delete-orphan')

    def to_dict(self, include_sensitive=False, include_companies=False):
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

        if include_sensitive:
            data.update({
                'registration_ip': self.registration_ip,
                'registration_country': self.registration_country,
                'registration_city': self.registration_city
            })

        if include_companies:
            data['companies'] = [
                {
                    'id': uc.company.id,
                    'name': uc.company.name,
                    'joined_via': uc.joined_via
                }
                for uc in self.companies if uc.company
            ]

        return data


class UserProgress(db.Model):
    __tablename__ = 'user_progress'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    day_number = db.Column(db.Integer, nullable=False)
    completed = db.Column(db.Boolean, default=False)
    last_accessed = db.Column(db.DateTime, default=datetime.utcnow)
    time_spent = db.Column(db.Integer, default=0)  # in seconds

    __table_args__ = (db.UniqueConstraint('user_id', 'day_number', name='_user_day_uc'),)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'day_number': self.day_number,
            'completed': self.completed,
            'last_accessed': self.last_accessed.isoformat() if self.last_accessed else None,
            'time_spent': self.time_spent
        }


class PageTimeTracking(db.Model):
    __tablename__ = 'page_time_tracking'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    page_url = db.Column(db.String(255), nullable=False)
    page_title = db.Column(db.String(255))
    time_spent = db.Column(db.Integer, default=0)  # in seconds
    visit_count = db.Column(db.Integer, default=1)
    last_visited = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'page_url': self.page_url,
            'page_title': self.page_title,
            'time_spent': self.time_spent,
            'visit_count': self.visit_count,
            'last_visited': self.last_visited.isoformat() if self.last_visited else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Company(db.Model):
    __tablename__ = 'companies'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), unique=True, nullable=False)
    slug = db.Column(db.String(200), unique=True, nullable=False)
    invite_code = db.Column(db.String(100), unique=True, nullable=False)
    email_domains = db.Column(db.Text, default='')  # comma-separated
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    members = db.relationship('UserCompany', backref='company', lazy=True, cascade='all, delete-orphan')
    day_access = db.relationship('CompanyDayAccess', backref='company', lazy=True, cascade='all, delete-orphan')

    @staticmethod
    def generate_slug(name):
        slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
        return slug

    def get_email_domains_list(self):
        if not self.email_domains:
            return []
        return [d.strip().lower() for d in self.email_domains.split(',') if d.strip()]

    def to_dict(self, include_access=False):
        data = {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'invite_code': self.invite_code,
            'email_domains': self.get_email_domains_list(),
            'is_active': self.is_active,
            'member_count': len(self.members),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        if include_access:
            data['accessible_days'] = sorted([da.day_number for da in self.day_access])
        return data


class UserCompany(db.Model):
    __tablename__ = 'user_companies'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    joined_via = db.Column(db.String(50), default='admin_assigned')  # 'invite_code', 'email_domain', 'admin_assigned'

    __table_args__ = (db.UniqueConstraint('user_id', 'company_id', name='_user_company_uc'),)


class CompanyDayAccess(db.Model):
    __tablename__ = 'company_day_access'

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    day_number = db.Column(db.Integer, nullable=False)
    granted_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('company_id', 'day_number', name='_company_day_uc'),)


def get_accessible_days_for_user(user_id):
    """Returns None for admin (all access), empty set for no-company users, or set of day_numbers."""
    user = User.query.get(user_id)
    if not user:
        return set()

    if user.is_admin:
        return None  # None means all access

    # Get all active companies the user belongs to
    user_companies = UserCompany.query.filter_by(user_id=user_id).all()
    if not user_companies:
        return set()

    company_ids = [uc.company_id for uc in user_companies]
    # Only include active companies
    active_companies = Company.query.filter(
        Company.id.in_(company_ids),
        Company.is_active == True
    ).all()

    if not active_companies:
        return set()

    active_ids = [c.id for c in active_companies]
    access_records = CompanyDayAccess.query.filter(
        CompanyDayAccess.company_id.in_(active_ids)
    ).all()

    return {a.day_number for a in access_records}
