"""
Script to create an admin user
Usage: python create_admin.py
"""
import os
import sys
from app import app
from models import db, User
from auth import hash_password

def create_admin_user():
    """Create an admin user with username 'admin' and password 'admin123'"""
    with app.app_context():
        # Check if admin already exists
        existing_admin = User.query.filter_by(username='admin').first()

        if existing_admin:
            print(f"Admin user already exists:")
            print(f"  Username: {existing_admin.username}")
            print(f"  Email: {existing_admin.email}")
            print(f"  Is Admin: {existing_admin.is_admin}")

            # Make sure they're an admin
            if not existing_admin.is_admin:
                existing_admin.is_admin = True
                db.session.commit()
                print("  Updated existing user to admin status")

            return

        # Create new admin user
        admin_user = User(
            username='admin',
            email='admin@lms.local',
            password_hash=hash_password('admin123'),
            is_admin=True,
            registration_ip='127.0.0.1',
            registration_country='Local',
            registration_city='Local'
        )

        db.session.add(admin_user)
        db.session.commit()

        print("Admin user created successfully!")
        print(f"  Username: admin")
        print(f"  Password: admin123")
        print(f"  Email: admin@lms.local")
        print("\nPlease change the password after first login!")


if __name__ == '__main__':
    try:
        create_admin_user()
    except Exception as e:
        print(f"Error creating admin user: {e}")
        sys.exit(1)
