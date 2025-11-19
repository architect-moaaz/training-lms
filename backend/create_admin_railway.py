"""
Script to create admin user directly in Railway PostgreSQL database
"""
import os
import psycopg2
from auth import hash_password

# Railway PostgreSQL connection string
DATABASE_URL = "postgresql://postgres:fyfkGyYURrWicCYYfwuRCdsOZJquyQkL@yamanote.proxy.rlwy.net:22927/railway"

def create_admin_user():
    """Create admin user in Railway database"""
    try:
        # Connect to the database
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()

        # Check if admin exists
        cursor.execute("SELECT id, username, email, is_admin FROM users WHERE username = 'admin'")
        existing_admin = cursor.fetchone()

        if existing_admin:
            print(f"Admin user already exists:")
            print(f"  ID: {existing_admin[0]}")
            print(f"  Username: {existing_admin[1]}")
            print(f"  Email: {existing_admin[2]}")
            print(f"  Is Admin: {existing_admin[3]}")

            # Make sure they're an admin
            if not existing_admin[3]:
                cursor.execute("UPDATE users SET is_admin = true WHERE username = 'admin'")
                conn.commit()
                print("  Updated existing user to admin status")
        else:
            # Hash the password
            password_hash = hash_password('admin123')

            # Insert admin user
            cursor.execute("""
                INSERT INTO users (username, email, password_hash, is_admin, created_at, registration_ip, registration_country, registration_city)
                VALUES (%s, %s, %s, %s, NOW(), %s, %s, %s)
            """, ('admin', 'admin@lms.local', password_hash, True, '127.0.0.1', 'Local', 'Local'))

            conn.commit()

            print("Admin user created successfully in Railway database!")
            print(f"  Username: admin")
            print(f"  Password: admin123")
            print(f"  Email: admin@lms.local")
            print("\nPlease change the password after first login!")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"Error creating admin user: {e}")
        raise


if __name__ == '__main__':
    create_admin_user()
