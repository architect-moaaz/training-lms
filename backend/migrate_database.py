"""
Database migration script to add new columns for admin system
"""
import psycopg2

# Railway PostgreSQL connection string
DATABASE_URL = "postgresql://postgres:fyfkGyYURrWicCYYfwuRCdsOZJquyQkL@yamanote.proxy.rlwy.net:22927/railway"

def migrate_database():
    """Add new columns to users table and create page_time_tracking table"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("Starting database migration...")

        # Add new columns to users table
        print("\n1. Adding new columns to users table...")

        try:
            cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE")
            print("   ✓ Added is_admin column")
        except Exception as e:
            print(f"   - is_admin: {e}")

        try:
            cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_ip VARCHAR(45)")
            print("   ✓ Added registration_ip column")
        except Exception as e:
            print(f"   - registration_ip: {e}")

        try:
            cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_country VARCHAR(100)")
            print("   ✓ Added registration_country column")
        except Exception as e:
            print(f"   - registration_country: {e}")

        try:
            cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_city VARCHAR(100)")
            print("   ✓ Added registration_city column")
        except Exception as e:
            print(f"   - registration_city: {e}")

        # Create page_time_tracking table
        print("\n2. Creating page_time_tracking table...")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS page_time_tracking (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                page_url VARCHAR(255) NOT NULL,
                page_title VARCHAR(255),
                time_spent INTEGER DEFAULT 0,
                visit_count INTEGER DEFAULT 1,
                last_visited TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("   ✓ Created page_time_tracking table")

        # Commit changes
        conn.commit()

        print("\n✅ Database migration completed successfully!")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        raise


if __name__ == '__main__':
    migrate_database()
