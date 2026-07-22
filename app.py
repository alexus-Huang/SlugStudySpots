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

@login_manager.unauthorized_handler
def unauthorized():
    # For fetch()-based API routes, send back JSON instead of an HTML
    # redirect — a fetch() call can't "navigate" the browser on its own.
    if request.path.startswith("/like_spot") or request.path.startswith("/submit_spot"):
        return jsonify({"error": "login_required"}), 401
    return redirect(url_for('login'))

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
    tags = data.get("tags", [])  # list of tags sent from the frontend; empty list if none provided
    connection = get_db_connection()
    connection.execute("""
    INSERT INTO study_spots
    (name, category, latitude, longitude, description, tags)
    VALUES (?, ?, ?, ?, ?, ?)
    """,
    (
        data["name"],
        data["category"],
        data["latitude"],
        data["longitude"],
        data["description"],
        ",".join(tags)  # store tags as one comma-separated string, e.g. "WiFi,Quiet"
    ))
    # ? placeholders protects app from SQL injection attacks

    connection.commit()  # saves new study spot into the db file
    connection.close()  # frees up resources when db is closed

    return jsonify({
        "message": "Spot submitted successfully"
    })

@app.route("/api/spots")
def get_spots():
    connection = get_db_connection()
    spots = connection.execute("SELECT * FROM study_spots").fetchall()

    result = []
    for spot in spots:
        like_count = connection.execute(
            "SELECT COUNT(*) FROM likes WHERE spot_id = ?", (spot["id"],)
        ).fetchone()[0]

        user_has_liked = False
        if current_user.is_authenticated:
            liked_row = connection.execute(
                "SELECT 1 FROM likes WHERE spot_id = ? AND user_id = ?",
                (spot["id"], current_user.id)
            ).fetchone()
            user_has_liked = liked_row is not None

        result.append({
            "id": spot["id"],
            "name": spot["name"],
            "category": spot["category"],
            "rating": spot["rating"],
            "latitude": spot["latitude"],
            "longitude": spot["longitude"],
            "description": spot["description"],
            "tags": spot["tags"].split(",") if spot["tags"] else [],
            "images": spot["images"].split(",") if spot["images"] else [],
            "likes": like_count,
            "user_has_liked": user_has_liked
        })

    connection.close()
    return jsonify(result)


@app.route("/like_spot/<int:spot_id>", methods=["POST"])
@login_required
def like_spot(spot_id):
    connection = get_db_connection()

    existing_like = connection.execute(
        "SELECT id FROM likes WHERE spot_id = ? AND user_id = ?",
        (spot_id, current_user.id)
    ).fetchone()

    if existing_like:
        # already liked -> remove it (un-like)
        connection.execute(
            "DELETE FROM likes WHERE spot_id = ? AND user_id = ?",
            (spot_id, current_user.id)
        )
        liked = False
    else:
        # not liked yet -> add it
        connection.execute(
            "INSERT INTO likes (spot_id, user_id) VALUES (?, ?)",
            (spot_id, current_user.id)
        )
        liked = True

    connection.commit()

    new_count = connection.execute(
        "SELECT COUNT(*) FROM likes WHERE spot_id = ?", (spot_id,)
    ).fetchone()[0]

    connection.close()

    return jsonify({"liked": liked, "likes": new_count})


if __name__ == '__main__':
    app.run(debug=True) # set to false or environment variable when deploying