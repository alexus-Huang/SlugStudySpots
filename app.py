import sqlite3
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/map')
def map():
    return render_template('map.html')

@app.route("/login")
def login():
    return render_template('login.html')

# Slugspots.db file
def get_db_connection():
    connection = sqlite3.connect("slugspots.db") # connect to slugspots database file
    connection.row_factory = sqlite3.Row #sqlite3.Row makes rows act like dictionaries; easier access (ex: row["name"])
    return connection #sends database the function

@app.route("/submit_spot", methods=["POST"]) # when a client sends a POST request to the url, run submit_spot()
def submit_spot():
    data = request.json # converts JSON data into a python dictionary
    connection = get_db_connection()
    connection.execute("""
    INSERT INTO study_spots
    (name, category, latitude, longitude, description)
    VALUES (?, ?, ?, ?, ?)
    """,
    (
        data["name"],
        data["category"],
        data["latitude"],
        data["longitude"],
        data["description"]
    ))
    # ? placeholders protects app from SQL injection attacks

    connection.commit() # saves new study spot into the db file
    connection.close() # frees up resources when db is closed

    return jsonify({
        "message": "Spot submitted successfully"
    })

if __name__ == '__main__':
    app.run(debug=True)

