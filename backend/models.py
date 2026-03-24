import re
import uuid
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
    profile = db.relationship('UserProfile', backref='user', uselist=False, lazy=True, cascade='all, delete-orphan')

    @property
    def onboarding_completed(self):
        return self.profile is not None

    def to_dict(self, include_sensitive=False, include_companies=False, include_profile=False):
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'is_admin': self.is_admin,
            'onboarding_completed': self.onboarding_completed,
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

        if include_profile and self.profile:
            data['profile'] = self.profile.to_dict()

        return data


class UserProfile(db.Model):
    __tablename__ = 'user_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    full_name = db.Column(db.String(200), nullable=False)
    phone = db.Column(db.String(20), default='')
    organization = db.Column(db.String(200), default='')
    job_title = db.Column(db.String(200), default='')
    country = db.Column(db.String(100), default='')
    city = db.Column(db.String(100), default='')
    experience_level = db.Column(db.String(50), default='')  # beginner, intermediate, advanced
    # Survey fields
    how_did_you_hear = db.Column(db.String(200), default='')
    learning_goals = db.Column(db.Text, default='')
    interests = db.Column(db.Text, default='')  # comma-separated
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'full_name': self.full_name,
            'phone': self.phone,
            'organization': self.organization,
            'job_title': self.job_title,
            'country': self.country,
            'city': self.city,
            'experience_level': self.experience_level,
            'how_did_you_hear': self.how_did_you_hear,
            'learning_goals': self.learning_goals,
            'interests': self.interests,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


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
    is_public = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    members = db.relationship('UserCompany', backref='company', lazy=True, cascade='all, delete-orphan')
    day_access = db.relationship('CompanyDayAccess', backref='company', lazy=True, cascade='all, delete-orphan')
    package_access = db.relationship('CompanyPackageAccess', backref='company', lazy=True, cascade='all, delete-orphan')

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
            'is_public': self.is_public,
            'member_count': len(self.members),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        if include_access:
            data['accessible_days'] = sorted([da.day_number for da in self.day_access])
            data['packages'] = [pa.package_id for pa in self.package_access]
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


class Event(db.Model):
    __tablename__ = 'events'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='')
    event_date = db.Column(db.Date, nullable=False)
    location = db.Column(db.String(300), default='')
    city = db.Column(db.String(100), default='')
    attendees = db.Column(db.String(50), default='')  # e.g. "200+", "25-50"
    image_url = db.Column(db.String(500))
    linkedin_url = db.Column(db.String(500))
    highlights = db.Column(db.Text, default='')  # comma-separated or newline-separated
    event_type = db.Column(db.String(50), default='workshop')  # workshop, bootcamp, hackathon, meetup
    is_upcoming = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'event_date': self.event_date.isoformat() if self.event_date else None,
            'location': self.location,
            'city': self.city,
            'attendees': self.attendees,
            'image_url': self.image_url,
            'linkedin_url': self.linkedin_url,
            'highlights': self.highlights,
            'event_type': self.event_type,
            'is_upcoming': self.is_upcoming,
            'is_active': self.is_active,
            'sort_order': self.sort_order,
        }


class FreeResource(db.Model):
    __tablename__ = 'free_resources'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='')
    url = db.Column(db.String(500), nullable=False)
    duration = db.Column(db.String(50), default='')
    instructor = db.Column(db.String(200), default='')
    level = db.Column(db.String(50), default='')  # beginner, intermediate, no-code
    category = db.Column(db.String(100), default='')  # grouping label
    thumbnail_url = db.Column(db.String(500))
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'url': self.url,
            'duration': self.duration,
            'instructor': self.instructor,
            'level': self.level,
            'category': self.category,
            'thumbnail_url': self.thumbnail_url,
            'sort_order': self.sort_order,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class UserFreeResourceEnrollment(db.Model):
    __tablename__ = 'user_free_resource_enrollments'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    resource_id = db.Column(db.Integer, db.ForeignKey('free_resources.id'), nullable=False)
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed = db.Column(db.Boolean, default=False)
    time_spent = db.Column(db.Integer, default=0)  # seconds
    last_accessed = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('user_id', 'resource_id', name='_user_resource_uc'),)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'resource_id': self.resource_id,
            'enrolled_at': self.enrolled_at.isoformat() if self.enrolled_at else None,
            'completed': self.completed,
            'time_spent': self.time_spent,
            'last_accessed': self.last_accessed.isoformat() if self.last_accessed else None,
        }


class CoursePackage(db.Model):
    __tablename__ = 'course_packages'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(200), unique=True, nullable=False)
    description = db.Column(db.Text, default='')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    days = db.relationship('CoursePackageDay', backref='package', lazy=True, cascade='all, delete-orphan')
    company_access = db.relationship('CompanyPackageAccess', backref='package', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'is_active': self.is_active,
            'days': sorted([d.day_number for d in self.days]),
            'company_count': len(self.company_access),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class CoursePackageDay(db.Model):
    __tablename__ = 'course_package_days'

    id = db.Column(db.Integer, primary_key=True)
    package_id = db.Column(db.Integer, db.ForeignKey('course_packages.id'), nullable=False)
    day_number = db.Column(db.Integer, nullable=False)

    __table_args__ = (db.UniqueConstraint('package_id', 'day_number', name='_package_day_uc'),)


class CompanyPackageAccess(db.Model):
    __tablename__ = 'company_package_access'

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    package_id = db.Column(db.Integer, db.ForeignKey('course_packages.id'), nullable=False)
    granted_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('company_id', 'package_id', name='_company_package_uc'),)


class CertificateTemplate(db.Model):
    __tablename__ = 'certificate_templates'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='')
    # Trigger: 'package' or 'category'
    trigger_type = db.Column(db.String(50), nullable=False)  # 'package', 'category'
    # For package: package_id. For category: category name (level like 'beginner')
    trigger_value = db.Column(db.String(200), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    certificates = db.relationship('Certificate', backref='template', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'trigger_type': self.trigger_type,
            'trigger_value': self.trigger_value,
            'is_active': self.is_active,
            'issued_count': len(self.certificates),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Certificate(db.Model):
    __tablename__ = 'certificates'

    id = db.Column(db.Integer, primary_key=True)
    cert_id = db.Column(db.String(50), unique=True, nullable=False, default=lambda: f"CERT-{uuid.uuid4().hex[:8].upper()}")
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    template_id = db.Column(db.Integer, db.ForeignKey('certificate_templates.id'), nullable=False)
    user_name = db.Column(db.String(200), nullable=False)
    certificate_title = db.Column(db.String(200), nullable=False)
    issued_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('certificates', lazy=True))

    __table_args__ = (db.UniqueConstraint('user_id', 'template_id', name='_user_template_uc'),)

    def to_dict(self):
        return {
            'id': self.id,
            'cert_id': self.cert_id,
            'user_id': self.user_id,
            'template_id': self.template_id,
            'user_name': self.user_name,
            'certificate_title': self.certificate_title,
            'issued_at': self.issued_at.isoformat() if self.issued_at else None,
        }


def get_accessible_days_for_user(user_id):
    """Returns None for admin (all access), or set of day_numbers.
    All authenticated users always get public days. Company users also get their company days."""
    user = User.query.get(user_id)
    if not user:
        return set()

    if user.is_admin:
        return None  # None means all access

    # Start with public days (all logged-in users get these)
    accessible = get_public_days()

    # Add company-specific days
    user_companies = UserCompany.query.filter_by(user_id=user_id).all()
    if user_companies:
        company_ids = [uc.company_id for uc in user_companies]
        active_companies = Company.query.filter(
            Company.id.in_(company_ids),
            Company.is_active == True
        ).all()

        if active_companies:
            active_ids = [c.id for c in active_companies]

            # Individual day access
            access_records = CompanyDayAccess.query.filter(
                CompanyDayAccess.company_id.in_(active_ids)
            ).all()
            accessible.update(a.day_number for a in access_records)

            # Package-based access
            package_access = CompanyPackageAccess.query.filter(
                CompanyPackageAccess.company_id.in_(active_ids)
            ).all()
            if package_access:
                package_ids = [pa.package_id for pa in package_access]
                package_days = CoursePackageDay.query.filter(
                    CoursePackageDay.package_id.in_(package_ids)
                ).all()
                accessible.update(pd.day_number for pd in package_days)

    return accessible


def get_public_days():
    """Returns set of day_numbers that are publicly browsable."""
    public_companies = Company.query.filter_by(is_public=True, is_active=True).all()
    public_day_numbers = set()
    for company in public_companies:
        for da in company.day_access:
            public_day_numbers.add(da.day_number)
    return public_day_numbers
