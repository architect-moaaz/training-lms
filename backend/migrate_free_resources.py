"""Migration: Create new tables and seed free resources from day4/5/6 metadata."""
import json
import os
from dotenv import load_dotenv
load_dotenv()

from app import app, db
from models import FreeResource, CoursePackage, CoursePackageDay, CompanyPackageAccess
from sqlalchemy import text

SEED_DATA = [
    # Day 4 - Beginner
    {"title": "How to Build Agentic AI Workflows", "url": "https://youtu.be/tr5Fapv80Cw", "duration": "2 hrs", "instructor": "Rola Dali, PhD", "level": "beginner", "category": "Agentic AI", "sort_order": 1},
    {"title": "Build an AI Coding Agent in Python", "url": "https://youtu.be/YtHdaXuOAks", "duration": "2 hrs", "instructor": "Lane Wagner", "level": "beginner", "category": "Agentic AI", "sort_order": 2},
    {"title": "Learn Python & Build Autonomous Agents", "url": "https://youtu.be/UsfpzxZNsPo", "duration": "6 hrs", "instructor": "freeCodeCamp", "level": "beginner", "category": "Agentic AI", "sort_order": 3},
    # Day 5 - Intermediate
    {"title": "Build Advanced AI Agents (Voice, Research, Multi-Agent)", "url": "https://www.youtube.com/results?search_query=How+to+Build+Advanced+AI+Agents+freeCodeCamp", "duration": "3 hrs", "instructor": "freeCodeCamp", "level": "intermediate", "category": "AI Frameworks", "sort_order": 4},
    {"title": "MCP Essentials with FastMCP", "url": "https://youtu.be/DosHnyq78xY", "duration": "1 hr", "instructor": "Carlos Leon", "level": "intermediate", "category": "AI Frameworks", "sort_order": 5},
    {"title": "Build AI Agents with Langbase (Agentic RAG)", "url": "https://youtu.be/BMt-qvrEcFY", "duration": "1 hr", "instructor": "Langbase", "level": "intermediate", "category": "AI Frameworks", "sort_order": 6},
    # Day 6 - No-code
    {"title": "n8n for Production-Grade AI Agents", "url": "https://youtu.be/UIf-SlmMays", "duration": "4 hrs", "instructor": "Marconi Darmawan", "level": "no-code", "category": "No-Code Automation", "sort_order": 7},
]

with app.app_context():
    # Create tables
    db.create_all()
    print("Tables created/verified.")

    # Seed free resources if empty
    if FreeResource.query.count() == 0:
        for data in SEED_DATA:
            db.session.add(FreeResource(**data))
        db.session.commit()
        print(f"Seeded {len(SEED_DATA)} free resources.")
    else:
        print(f"Free resources already exist ({FreeResource.query.count()} rows). Skipping seed.")

    print("Migration complete.")
