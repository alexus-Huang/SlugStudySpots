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

    conn.commit()
    conn.close()
    
create_database()