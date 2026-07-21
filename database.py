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

    conn.commit()
    conn.close()

create_database()