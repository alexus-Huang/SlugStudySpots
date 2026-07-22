import sqlite3

connection = sqlite3.connect("slugspots.db")
cursor = connection.cursor()

spots = [
    ("McHenry Library", "library", 4.8, 36.995875743537674, -122.05901523332899,
     "Large library with plenty of study spaces, including quiet areas and group study rooms. Offers WiFi and outlets throughout the building.",
     "Quiet,WiFi,Outlets,Study Rooms",
     "/static/images/mchenry1.jpg,/static/images/mchenry2.jpg"),

    ("Porter Meadow", "nature", 4.6, 36.99482501832458, -122.06770300827198,
     "A beautiful outdoor space with plenty of seating. Perfect for studying on a sunny day.",
     "Outdoors",
     "/static/images/porter1.jpg,/static/images/porter2.jpg"),

    ("Science & Engineering Library", "library", 4.7, 36.99915251483445, -122.06074506216467,
     "Offers a quiet environment with WiFi, outlets, and study rooms. Vending machines are available for snacks and drinks on the second floor.",
     "Quiet,WiFi,Outlets,Study Rooms,Vending Machines",
     "/static/images/sne1.jpg,/static/images/sne2.jpg"),

    ("Oakes Cafe", "cafe", 4.5, 36.989257131680056, -122.06341090148356,
     "A cozy cafe located in Oakes College, offering WiFi, outlets, and a variety of food and drinks. Great for studying or taking a break.",
     "WiFi,Outlets,Food,Drinks",
     "/static/images/oakes1.jpg,/static/images/oakes2.jpg"),

    ("Cowell Computer Lab", "computer lab", 4.0, 36.99694416238935, -122.05509338653381,
     "A computer lab located in Cowell College, offering WiFi, outlets, computers, and a printer. A quiet space for focused work.",
     "WiFi,Outlets,Computers,Printer,Quiet",
     "/static/images/cowell1.jpg,/static/images/cowell2.jpg"),

    ("Global Village Cafe", "cafe", 4.3, 36.99610086311118, -122.05949219643405,
     "A cafe located in McHenry Library, offering WiFi, food, and drinks. A great spot for studying or socializing.",
     "WiFi,Food,Drinks",
     "/static/images/globalvillage1.jpg,/static/images/globalvillage2.jpg"),
]

for spot in spots:
    cursor.execute("""
        INSERT INTO study_spots (name, category, rating, latitude, longitude, description, tags, images)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, spot)

connection.commit()
connection.close()
print("Seeded", len(spots), "spots.")