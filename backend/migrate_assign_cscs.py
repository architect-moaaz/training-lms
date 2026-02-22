"""
One-off migration script: Create 'cscs' company and assign all existing users to it.

Usage:
  - Via Railway CLI:  railway run python migrate_assign_cscs.py
  - Via Railway shell: python migrate_assign_cscs.py
  - Locally: source venv/bin/activate && python migrate_assign_cscs.py
"""
from app import app, db
from models import Company, User, UserCompany, CompanyDayAccess

COMPANY_NAME = 'CSCS'
INVITE_CODE = 'cscs2025'
EMAIL_DOMAINS = ''  # Set if needed, e.g. 'cscs.com,cscs.org'

# Grant access to all existing days (adjust as needed)
ACCESSIBLE_DAYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

with app.app_context():
    # 1. Create the company if it doesn't exist
    company = Company.query.filter_by(name=COMPANY_NAME).first()
    if not company:
        company = Company(
            name=COMPANY_NAME,
            slug=Company.generate_slug(COMPANY_NAME),
            invite_code=INVITE_CODE,
            email_domains=EMAIL_DOMAINS,
            is_active=True,
        )
        db.session.add(company)
        db.session.flush()
        print(f"Created company '{COMPANY_NAME}' (id={company.id}, invite_code='{INVITE_CODE}')")
    else:
        print(f"Company '{COMPANY_NAME}' already exists (id={company.id})")

    # 2. Set day access
    existing_access = {da.day_number for da in CompanyDayAccess.query.filter_by(company_id=company.id).all()}
    added_days = 0
    for day_num in ACCESSIBLE_DAYS:
        if day_num not in existing_access:
            db.session.add(CompanyDayAccess(company_id=company.id, day_number=day_num))
            added_days += 1
    if added_days:
        print(f"Granted access to {added_days} new days (total: {ACCESSIBLE_DAYS})")
    else:
        print(f"Day access already set: {sorted(existing_access)}")

    # 3. Assign all existing users to the company
    users = User.query.all()
    assigned = 0
    skipped = 0
    for user in users:
        existing = UserCompany.query.filter_by(user_id=user.id, company_id=company.id).first()
        if not existing:
            uc = UserCompany(user_id=user.id, company_id=company.id, joined_via='admin_assigned')
            db.session.add(uc)
            assigned += 1
            print(f"  Assigned: {user.username} ({user.email})")
        else:
            skipped += 1

    db.session.commit()

    print(f"\nDone! Assigned {assigned} users, skipped {skipped} (already members).")
    print(f"Total users in '{COMPANY_NAME}': {assigned + skipped}")
