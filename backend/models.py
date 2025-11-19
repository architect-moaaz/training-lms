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

    def to_dict(self, include_sensitive=False):
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
