import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def create_database():
    conn = sqlite3.connect("slugspots.db")
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS study_spots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        rating REAL DEFAULT 0,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        description TEXT,
        likes INTEGER DEFAULT 0
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        points INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    try:
        cursor.execute("ALTER TABLE study_spots ADD COLUMN tags TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass  # column already exists, nothing to do

    try:
        cursor.execute("ALTER TABLE study_spots ADD COLUMN images TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE study_spots ADD COLUMN submitted_by INTEGER")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE pending_spots ADD COLUMN images TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN last_login TIMESTAMP")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE reviews ADD COLUMN edited_at TIMESTAMP")
    except sqlite3.OperationalError:
        pass
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS page_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT NOT NULL,
        user_id INTEGER,
        visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)
    # likes table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        spot_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        UNIQUE(spot_id, user_id),
        FOREIGN KEY (spot_id) REFERENCES study_spots(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # reviews table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        spot_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(spot_id, user_id),
        FOREIGN KEY (spot_id) REFERENCES study_spots(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # pending_spots table — holds submitted spots awaiting your approval
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pending_spots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        description TEXT,
        tags TEXT DEFAULT '',
        submitted_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (submitted_by) REFERENCES users(id)
    )
    """)

    # badges table — the fixed list of badge definitions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS badges (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT DEFAULT '🏅'
    )
    """)

    # user_badges table — tracks which users have earned which badges
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        badge_code TEXT NOT NULL,
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, badge_code),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (badge_code) REFERENCES badges(code)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pending_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        spot_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        submitted_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (spot_id) REFERENCES study_spots(id),
        FOREIGN KEY (submitted_by) REFERENCES users(id)
    )
    """)

    conn.commit()
    conn.close()
    
create_database()