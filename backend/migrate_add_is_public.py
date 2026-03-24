"""Migration script to add is_public column to companies table."""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

from app import app, db
from sqlalchemy import text

with app.app_context():
    try:
        # Check if column already exists
        result = db.session.execute(text("PRAGMA table_info(companies)")).fetchall()
        columns = [row[1] for row in result]

        if 'is_public' not in columns:
            db.session.execute(text("ALTER TABLE companies ADD COLUMN is_public BOOLEAN DEFAULT 0"))
            db.session.commit()
            print("Added is_public column to companies table")
        else:
            print("is_public column already exists")

    except Exception as e:
        # For PostgreSQL
        try:
            db.session.rollback()
            db.session.execute(text("ALTER TABLE companies ADD COLUMN is_public BOOLEAN DEFAULT FALSE"))
            db.session.commit()
            print("Added is_public column to companies table (PostgreSQL)")
        except Exception as e2:
            if 'already exists' in str(e2).lower() or 'duplicate column' in str(e2).lower():
                print("is_public column already exists")
            else:
                print(f"Error: {e2}")
                sys.exit(1)
