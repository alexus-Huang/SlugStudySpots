import sqlite3

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

    conn.commit()
    conn.close()
    
create_database()