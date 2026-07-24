import sqlite3

connection = sqlite3.connect("slugspots.db")
cursor = connection.cursor()

badges = [
    ("welcome", "Welcome to the Herd", "Signed up for SlugSpots.", "👋"),
    ("first_spot", "First Spot", "Your first suggested study spot got approved.", "📍"),
    ("frequent_flyer", "Frequent Flyer", "You've had 3 study spots approved.", "🧳"),
    ("campus_cartographer", "Campus Cartographer", "You've had 5 study spots approved.", "🗺️"),
    ("well_rounded", "Well-Rounded", "You've had approved spots in 3 or more different categories.", "🎯"),

    ("first_review", "First Review", "You wrote your first review.", "✍️"),
    ("prolific_reviewer_5", "Prolific Reviewer", "You've written 5 reviews.", "📝"),
    ("prolific_reviewer_15", "Study Sage", "You've written 15 reviews.", "📚"),
    ("prolific_reviewer_20", "Critic in Residence", "You've written 20 reviews.", "🧐"),
    ("prolific_reviewer_30", "Review Royalty", "You've written 30 reviews.", "👑"),

    ("popular_pick", "Popular Pick", "A spot you suggested reached 5 reviews.", "⭐"),

    ("well_loved_5", "Well-Loved", "A spot you suggested reached 5 likes.", "💙"),
    ("well_loved_10", "Crowd Favorite", "A spot you suggested reached 10 likes.", "💜"),
    ("well_loved_15", "Fan Favorite", "A spot you suggested reached 15 likes.", "💛"),
    ("well_loved_20", "Spot of the Semester", "A spot you suggested reached 20 likes.", "🧡"),
    ("well_loved_30", "Campus Legend", "A spot you suggested reached 30 likes.", "🏆"),
]

for badge in badges:
    cursor.execute("""
        INSERT OR IGNORE INTO badges (code, name, description, icon)
        VALUES (?, ?, ?, ?)
    """, badge)

connection.commit()
connection.close()
print("Seeded", len(badges), "badges.")