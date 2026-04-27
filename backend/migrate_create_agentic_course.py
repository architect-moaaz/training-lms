"""
One-off migration: create the 'Agentic AI Course' CoursePackage.

Bundles the six modules under public/student_course/ (day_numbers 101-106)
into a single package that admins can grant to companies via the existing
admin UI. Idempotent — safe to run multiple times.

Usage:
  source venv/bin/activate && python migrate_create_agentic_course.py
  # or on Railway: railway run python migrate_create_agentic_course.py
"""
from app import app, db
from models import CoursePackage, CoursePackageDay

PACKAGE_NAME = 'Agentic AI Course'
PACKAGE_SLUG = 'agentic-ai-course'
PACKAGE_DESCRIPTION = (
    'Build intelligent systems with GenAI: foundations, fine-tuning, RAG, '
    'MCP, and multi-agent systems. Each module has a hands-on capstone with '
    'scoring rubric and monitoring requirements.'
)
PACKAGE_DAYS = [101, 102, 103, 104, 105, 106]

with app.app_context():
    pkg = CoursePackage.query.filter_by(slug=PACKAGE_SLUG).first()
    if not pkg:
        pkg = CoursePackage(
            name=PACKAGE_NAME,
            slug=PACKAGE_SLUG,
            description=PACKAGE_DESCRIPTION,
            is_active=True,
        )
        db.session.add(pkg)
        db.session.flush()
        print(f"Created package '{PACKAGE_NAME}' (id={pkg.id})")
    else:
        # Refresh description in case it has been edited
        pkg.description = PACKAGE_DESCRIPTION
        pkg.is_active = True
        print(f"Package '{PACKAGE_NAME}' already exists (id={pkg.id})")

    existing = {d.day_number for d in CoursePackageDay.query.filter_by(package_id=pkg.id).all()}
    added = 0
    for day_num in PACKAGE_DAYS:
        if day_num not in existing:
            db.session.add(CoursePackageDay(package_id=pkg.id, day_number=day_num))
            added += 1
    if added:
        print(f"Added {added} days to package: {sorted(set(PACKAGE_DAYS) - existing)}")
    else:
        print(f"All days already attached: {sorted(existing)}")

    db.session.commit()
    print("Done. Grant this package to companies via the admin UI ->")
    print("Admin -> Companies -> select company -> Packages -> tick 'Agentic AI Course'.")
