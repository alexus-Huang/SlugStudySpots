import os
import sqlite3
import re
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from database import create_database
load_dotenv()  # reads .env and loads it into environment variables

app = Flask(__name__)
create_database()
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY")

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

# Regex
EMAIL_REGEX = re.compile(r'^[\w.+-]+@[\w-]+\.[a-zA-Z0-9-.]+$')
USERNAME_REGEX = re.compile(r'^[A-Za-z0-9_]{3,20}$')
PASSWORD_REGEX = re.compile(r'^(?=.*[A-Za-z])(?=.*\d).{8,}$')

# Slugspots.db file
def get_db_connection():
    connection = sqlite3.connect("slugspots.db")  # connect to slugspots database file
    connection.row_factory = sqlite3.Row  # sqlite3.Row makes rows act like dictionaries; easier access (ex: row["name"])
    return connection  # sends database the function

class User(UserMixin):
    def __init__(self, id, username, points):
        self.id = id
        self.username = username
        self.points = points

@login_manager.user_loader
def load_user(user_id):
    connection = get_db_connection()
    row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    connection.close()
    if row is None:
        return None
    return User(row["id"], row["username"], row["points"])

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/map')
def map():
    return render_template('map.html')

@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        if not username or not email or not password:
            flash("Please fill out every field.","error")
            return redirect(url_for('signup'))

        if not USERNAME_REGEX.match(username):
            flash("Username must be 3-20 characters, letters/numbers/underscores only.","error")
            return redirect(url_for('signup'))

        if not EMAIL_REGEX.match(email):
            flash("Please enter a valid email address.","error")
            return redirect(url_for('signup'))

        if not PASSWORD_REGEX.match(password):
            flash("Password must be at least 8 characters and include a letter and a number.","error")
            return redirect(url_for('signup'))

        password_hash = generate_password_hash(password)

        connection = get_db_connection()
        try:
            connection.execute(
                "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                (username, email, password_hash),
            )
            connection.commit()
        except sqlite3.IntegrityError:
            flash("That username or email is already taken.","error")
            connection.close()
            return redirect(url_for('signup'))
        connection.close()

        flash("Account created! Please log in.", "success")
        return redirect(url_for('login'))

    return render_template('signup.html')

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        connection = get_db_connection()
        row = connection.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        connection.close()

        if row is None or not check_password_hash(row["password_hash"], password):
            flash("Invalid email or password.","error")
            return redirect(url_for('login'))

        user = User(row["id"], row["username"], row["points"])
        login_user(user)
        return redirect(url_for('home'))

    return render_template('login.html')

@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for('home'))


@app.route("/submit_spot", methods=["POST"])  # when a client sends a POST request to the url, run submit_spot()
@login_required
def submit_spot():
    data = request.json  # converts JSON data into a python dictionary
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

    connection.commit()  # saves new study spot into the db file
    connection.close()  # frees up resources when db is closed

    return jsonify({
        "message": "Spot submitted successfully"
    })


if __name__ == '__main__':
    app.run(debug=True) # set to false or environment variable when deploying