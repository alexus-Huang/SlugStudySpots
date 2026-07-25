import sqlite3

connection = sqlite3.connect("slugspots.db")
cursor = connection.cursor()

new_spots = [
    ("Crown Library", "library", 4.8, 36.999823, -122.054804,
     "Quiet study spot with comfy seats and tables. A Mac computer lab is right upstairs if you need a computer.",
     "Quiet,Computers,Study Rooms", ""),

    ("Owl's Nest Cafe", "cafe", 3.9, 36.998633, -122.066436,
     "Plant-based cafe tucked into the Kresge/Porter area, known for build-your-own grain bowls, smoothies, and coffee. Can get a long line at peak hours.",
     "Food,Drinks,WiFi", ""),

    ("Bistro Lounge (above C9/JRL Dining)", "lounge", 0, 37.000769, -122.057834,
     "Casual lounge seating above the College Nine/John R. Lewis dining hall, good for a quick bite and study break.",
     "Food,WiFi", ""),

    ("College Nine Multipurpose Room/Rec Lounge", "lounge", 0, 37.000626, -122.057707,
     "Open lounge space in the University Center, available evenings and overnight.",
     "Quiet,Study Rooms", ""),

    ("Namaste Lounge (College 9/10)", "lounge", 4.5, 37.000756, -122.057191,
     "Open late, more suited for activities and music than heads-down studying, with light table space.",
     "WiFi", ""),

    ("Perk Coffee Bar (Baskin Engineering)", "cafe", 4.3, 37.000461, -122.063017,
     "Coffee bar with seating right in the engineering building, convenient for CS/engineering students between classes.",
     "Food,Drinks,WiFi,Outlets", ""),

    ("East Upper Field", "nature", 0, 36.994636, -122.054847,
     "Large outdoor grass field near the East Field House, good for a change of scenery if you like studying outside.",
     "Outdoors", ""),

    ("Page Smith Library", "library", 4.0, 36.996891, -122.053567,
     "Small, cozy space with friendly, inspiring graffiti, more lounge-like than a traditional library. No bathroom on site.",
     "Quiet", ""),

    ("Merrill Library", "library", 5.0, 36.999357, -122.053307,
     "Multi-level library with quiet nooks tucked throughout.",
     "Quiet,Study Rooms", ""),
]

for spot in new_spots:
    cursor.execute("""
        INSERT INTO study_spots (name, category, rating, latitude, longitude, description, tags, images)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, spot)

connection.commit()
connection.close()
print("Added", len(new_spots), "new spots.")