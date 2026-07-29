import os
import sqlite3
import re
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from database import create_database
from functools import wraps
from better_profanity import profanity
import os
import uuid
from werkzeug.utils import secure_filename
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_limiter.errors import RateLimitExceeded

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))  # reads .env and loads it into environment variables

app = Flask(__name__)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"]
)
create_database()
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY")
csrf = CSRFProtect(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

@login_manager.unauthorized_handler
def unauthorized():
    # redirect — a fetch() call can't "navigate" the browser on its own.
    if request.path.startswith("/like_spot") or request.path.startswith("/submit_spot") or request.path.startswith("/submit_review") or request.path.startswith("/submit_feedback") or request.path.startswith("/submit_spot_image") or request.path.startswith("/edit_review") or request.path.startswith("/delete_review"):
        return jsonify({"error": "login_required"}), 401
    return redirect(url_for('login'))

@app.errorhandler(RateLimitExceeded)
def handle_rate_limit(e):
    return render_template('rate_limited.html'), 429

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            return render_template('access_denied.html'), 403
        return f(*args, **kwargs)
    return decorated_function
# Regex
EMAIL_REGEX = re.compile(r'^[\w.+-]+@[\w-]+\.[a-zA-Z0-9-.]+$')
USERNAME_REGEX = re.compile(r'^[A-Za-z0-9]{3,20}$')
PASSWORD_REGEX = re.compile(r'^(?=.*[A-Za-z])(?=.*\d).{8,}$')
RESERVED_USERNAMES = ["admin", "administrator", "moderator", "mod", "slugspots", "root", "superuser", "owner"]

LEET_MAP = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s"})

ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB

def allowed_image(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS

def contains_reserved_word(username):
    normalized = username.lower().translate(LEET_MAP)
    normalized = re.sub(r'[^a-z0-9]', '', normalized)
    return any(word in normalized for word in RESERVED_USERNAMES)

profanity.load_censor_words()

# Slugspots.db file
def get_db_connection():
    connection = sqlite3.connect(os.path.join(BASE_DIR, "slugspots.db"))
    connection.row_factory = sqlite3.Row
    return connection  # sends database the function

def award_points(user_id, amount):
    if user_id is None:
        return  # no submitter to credit (e.g. one of the original seeded spots)
    connection = get_db_connection()
    connection.execute(
        "UPDATE users SET points = points + ? WHERE id = ?",
        (amount, user_id)
    )
    connection.commit()
    connection.close()

def award_badge(user_id, badge_code):
    if user_id is None:
        return
    connection = get_db_connection()
    connection.execute(
        "INSERT OR IGNORE INTO user_badges (user_id, badge_code) VALUES (?, ?)",
        (user_id, badge_code)
    )
    connection.commit()
    connection.close()

def check_submission_badges(user_id):
    if user_id is None:
        return
    connection = get_db_connection()

    approved_count = connection.execute(
        "SELECT COUNT(*) FROM study_spots WHERE submitted_by = ?", (user_id,)
    ).fetchone()[0]

    category_count = connection.execute(
        "SELECT COUNT(DISTINCT category) FROM study_spots WHERE submitted_by = ?", (user_id,)
    ).fetchone()[0]

    connection.close()

    if approved_count >= 1:
        award_badge(user_id, "first_spot")
    if approved_count >= 3:
        award_badge(user_id, "frequent_flyer")
    if approved_count >= 5:
        award_badge(user_id, "campus_cartographer")
    if category_count >= 3:
        award_badge(user_id, "well_rounded")


def check_review_badges(user_id):
    connection = get_db_connection()
    review_count = connection.execute(
        "SELECT COUNT(*) FROM reviews WHERE user_id = ?", (user_id,)
    ).fetchone()[0]
    connection.close()

    if review_count >= 1:
        award_badge(user_id, "first_review")
    if review_count >= 5:
        award_badge(user_id, "prolific_reviewer_5")
    if review_count >= 15:
        award_badge(user_id, "prolific_reviewer_15")
    if review_count >= 20:
        award_badge(user_id, "prolific_reviewer_20")
    if review_count >= 30:
        award_badge(user_id, "prolific_reviewer_30")


def check_spot_popularity_badges(spot_id):
    connection = get_db_connection()

    spot = connection.execute(
        "SELECT submitted_by FROM study_spots WHERE id = ?", (spot_id,)
    ).fetchone()

    if spot is None or spot["submitted_by"] is None:
        connection.close()
        return

    like_count = connection.execute(
        "SELECT COUNT(*) FROM likes WHERE spot_id = ?", (spot_id,)
    ).fetchone()[0]

    review_count = connection.execute(
        "SELECT COUNT(*) FROM reviews WHERE spot_id = ?", (spot_id,)
    ).fetchone()[0]

    connection.close()

    user_id = spot["submitted_by"]

    if review_count >= 5:
        award_badge(user_id, "popular_pick")
    if like_count >= 5:
        award_badge(user_id, "well_loved_5")
    if like_count >= 10:
        award_badge(user_id, "well_loved_10")
    if like_count >= 15:
        award_badge(user_id, "well_loved_15")
    if like_count >= 20:
        award_badge(user_id, "well_loved_20")
    if like_count >= 30:
        award_badge(user_id, "well_loved_30")
class User(UserMixin):
    def __init__(self, id, username, points, is_admin):
        self.id = id
        self.username = username
        self.points = points
        self.is_admin = is_admin

@login_manager.user_loader
def load_user(user_id):
    connection = get_db_connection()
    row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    connection.close()
    if row is None:
        return None
    return User(row["id"], row["username"], row["points"], row["is_admin"])

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
@limiter.limit("5 per minute")
def signup():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        if not username or not email or not password:
            flash("Please fill out every field.","error")
            return redirect(url_for('signup'))

        if not USERNAME_REGEX.match(username):
            flash("Username must be 3-20 characters, letters and numbers only.","error")
            return redirect(url_for('signup'))

        if contains_reserved_word(username):
            flash("That username isn't allowed.","error")
            return redirect(url_for('signup'))

        if profanity.contains_profanity(username):
            flash("That username isn't allowed.","error")
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

            new_user = connection.execute(
                "SELECT id FROM users WHERE username = ?", (username,)
            ).fetchone()
            connection.close()

            award_badge(new_user["id"], "welcome")

        except sqlite3.IntegrityError:
            flash("That username or email is already taken.","error")
            connection.close()
            return redirect(url_for('signup'))

        flash("Account created! Please log in.", "success")
        return redirect(url_for('login'))

    return render_template('signup.html')

@app.route("/login", methods=["GET", "POST"])
@limiter.limit("5 per minute")
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

        user = User(row["id"], row["username"], row["points"], row["is_admin"])
        login_user(user)

        connection2 = get_db_connection()
        connection2.execute(
            "UPDATE users SET last_login = CURRENT_TIMESTAMP, login_count = login_count + 1 WHERE id = ?",
            (row["id"],)
        )
        connection2.commit()
        connection2.close()

        return redirect(url_for('home'))

    return render_template('login.html')

@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for('home'))


@app.route("/submit_spot", methods=["POST"])
@login_required
def submit_spot():
    name = request.form.get("name")
    category = request.form.get("category")
    latitude = request.form.get("latitude")
    longitude = request.form.get("longitude")
    description = request.form.get("description")
    tags_raw = request.form.get("tags", "")
    tags = tags_raw.split(",") if tags_raw else []

    uploaded_files = request.files.getlist("images")
    saved_filenames = []

    for file in uploaded_files:
        if file and file.filename != "" and allowed_image(file.filename):
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)

            if file_size > MAX_IMAGE_SIZE:
                continue  # skip oversized files rather than failing the whole submission

            original_extension = file.filename.rsplit(".", 1)[1].lower()
            unique_filename = f"{uuid.uuid4().hex}.{original_extension}"
            upload_path = os.path.join(BASE_DIR, "static", "images", "pending", unique_filename)
            file.save(upload_path)
            saved_filenames.append(unique_filename)

    connection = get_db_connection()
    connection.execute("""
    INSERT INTO pending_spots
    (name, category, latitude, longitude, description, tags, images, submitted_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """,
    (
        name,
        category,
        latitude,
        longitude,
        description,
        ",".join(tags),
        ",".join(saved_filenames),
        current_user.id
    ))

    connection.commit()
    connection.close()

    return jsonify({
        "message": "Spot submitted for review! It'll appear on the map once approved."
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

        review_stats = connection.execute(
            "SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE spot_id = ?",
            (spot["id"],)
        ).fetchone()

        if review_stats["review_count"] > 0:
            display_rating = round(review_stats["avg_rating"], 1)
        else:
            display_rating = spot["rating"]

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
            "rating": display_rating,
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

    spot = connection.execute(
        "SELECT submitted_by FROM study_spots WHERE id = ?", (spot_id,)
    ).fetchone()

    existing_like = connection.execute(
        "SELECT id FROM likes WHERE spot_id = ? AND user_id = ?",
        (spot_id, current_user.id)
    ).fetchone()

    if existing_like:
        connection.execute(
            "DELETE FROM likes WHERE spot_id = ? AND user_id = ?",
            (spot_id, current_user.id)
        )
        liked = False
    else:
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

    if spot is not None:
        award_points(spot["submitted_by"], 3 if liked else -3)

    check_spot_popularity_badges(spot_id)

    return jsonify({"liked": liked, "likes": new_count})

@app.route("/api/spots/<int:spot_id>/reviews")
def get_reviews(spot_id):
    connection = get_db_connection()
    reviews = connection.execute("""
        SELECT reviews.id, reviews.rating, reviews.comment, reviews.created_at, reviews.edited_at, reviews.user_id, users.username
        FROM reviews
        JOIN users ON reviews.user_id = users.id
        WHERE reviews.spot_id = ?
        ORDER BY reviews.created_at DESC
    """, (spot_id,)).fetchall()
    connection.close()

    result = []
    for review in reviews:
        result.append({
            "id": review["id"],
            "username": review["username"],
            "rating": review["rating"],
            "comment": review["comment"],
            "edited": review["edited_at"] is not None,
            "is_owner": current_user.is_authenticated and review["user_id"] == current_user.id
        })

    return jsonify(result)

# Review Submission
@app.route("/submit_review/<int:spot_id>", methods=["POST"])
@login_required
def submit_review(spot_id):
    data = request.json
    rating = data.get("rating")
    comment = data.get("comment", "").strip()

    if not comment:
        return jsonify({"error": "Review cannot be empty."}), 400

    if profanity.contains_profanity(comment):
        return jsonify({"error": "Please remove inappropriate language from your review."}), 400
    
    if not isinstance(rating, int) or rating < 1 or rating > 5:
        return jsonify({"error": "Rating must be between 1 and 5."}), 400

    connection = get_db_connection()
    try:
        connection.execute(
            "INSERT INTO reviews (spot_id, user_id, rating, comment) VALUES (?, ?, ?, ?)",
            (spot_id, current_user.id, rating, comment)
        )
        connection.commit()
    except sqlite3.IntegrityError:
        connection.close()
        return jsonify({"error": "You've already reviewed this spot."}), 409

    connection.close()

    award_points(current_user.id, 5)
    check_review_badges(current_user.id)
    check_spot_popularity_badges(spot_id)

    return jsonify({"message": "Review submitted successfully"})

@app.route("/edit_review/<int:review_id>", methods=["POST"])
@login_required
def edit_review(review_id):
    data = request.json
    rating = data.get("rating")
    comment = data.get("comment", "").strip()

    if not comment:
        return jsonify({"error": "Review cannot be empty."}), 400

    if profanity.contains_profanity(comment):
        return jsonify({"error": "Please remove inappropriate language from your review."}), 400

    if not isinstance(rating, int) or rating < 1 or rating > 5:
        return jsonify({"error": "Rating must be between 1 and 5."}), 400

    connection = get_db_connection()
    review = connection.execute(
        "SELECT * FROM reviews WHERE id = ?", (review_id,)
    ).fetchone()

    if review is None:
        connection.close()
        return jsonify({"error": "Review not found."}), 404

    if review["user_id"] != current_user.id:
        connection.close()
        return jsonify({"error": "You can only edit your own reviews."}), 403

    connection.execute(
        "UPDATE reviews SET rating = ?, comment = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ?",
        (rating, comment, review_id)
    )
    connection.commit()
    connection.close()

    check_spot_popularity_badges(review["spot_id"])

    return jsonify({"message": "Review updated successfully"})


@app.route("/delete_review/<int:review_id>", methods=["POST"])
@login_required
def delete_review(review_id):
    connection = get_db_connection()
    review = connection.execute(
        "SELECT * FROM reviews WHERE id = ?", (review_id,)
    ).fetchone()

    if review is None:
        connection.close()
        return jsonify({"error": "Review not found."}), 404

    if review["user_id"] != current_user.id:
        connection.close()
        return jsonify({"error": "You can only delete your own reviews."}), 403

    connection.execute("DELETE FROM reviews WHERE id = ?", (review_id,))
    connection.commit()
    connection.close()

    award_points(current_user.id, -5)
    check_spot_popularity_badges(review["spot_id"])

    return jsonify({"message": "Review deleted"})

# Admin
@app.route("/admin/review")
@admin_required
def admin_review():
    connection = get_db_connection()
    pending = connection.execute("""
        SELECT pending_spots.*, users.username
        FROM pending_spots
        JOIN users ON pending_spots.submitted_by = users.id
        ORDER BY pending_spots.created_at ASC
    """).fetchall()
    connection.close()
    return render_template('admin_review.html', pending=pending)


@app.route("/admin/approve/<int:pending_id>", methods=["POST"])
@admin_required
def admin_approve(pending_id):
    connection = get_db_connection()
    spot = connection.execute(
        "SELECT * FROM pending_spots WHERE id = ?", (pending_id,)
    ).fetchone()

    if spot is None:
        connection.close()
        return jsonify({"error": "Not found"}), 404

    pending_filenames = spot["images"].split(",") if spot["images"] else []
    live_paths = []

    for filename in pending_filenames:
        old_path = os.path.join(BASE_DIR, "static", "images", "pending", filename)
        new_path = os.path.join(BASE_DIR, "static", "images", filename)
        if os.path.exists(old_path):
            os.rename(old_path, new_path)
            live_paths.append(f"/static/images/{filename}")

    connection.execute("""
        INSERT INTO study_spots (name, category, latitude, longitude, description, tags, images, submitted_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (spot["name"], spot["category"], spot["latitude"], spot["longitude"], spot["description"], spot["tags"], ",".join(live_paths), spot["submitted_by"]))

    connection.execute("DELETE FROM pending_spots WHERE id = ?", (pending_id,))
    connection.commit()
    connection.close()

    award_points(spot["submitted_by"], 25)
    check_submission_badges(spot["submitted_by"])
    return jsonify({"message": "Spot approved"})


@app.route("/admin/reject/<int:pending_id>", methods=["POST"])
@admin_required
def admin_reject(pending_id):
    connection = get_db_connection()
    spot = connection.execute(
        "SELECT images FROM pending_spots WHERE id = ?", (pending_id,)
    ).fetchone()

    if spot and spot["images"]:
        for filename in spot["images"].split(","):
            file_path = os.path.join(BASE_DIR, "static", "images", "pending", filename)
            if os.path.exists(file_path):
                os.remove(file_path)

    connection.execute("DELETE FROM pending_spots WHERE id = ?", (pending_id,))
    connection.commit()
    connection.close()
    return jsonify({"message": "Spot rejected"})

@app.route("/leaderboard")
def leaderboard():
    connection = get_db_connection()
    top_users = connection.execute("""
        SELECT username, points
        FROM users
        WHERE is_admin = 0
        ORDER BY points DESC
        LIMIT 20
    """).fetchall()
    connection.close()

    return render_template('leaderboard.html', top_users=top_users)

@app.route("/profile")
@login_required
def profile():
    connection = get_db_connection()

    earned_badges = connection.execute("""
        SELECT badges.name, badges.description, badges.icon, user_badges.earned_at
        FROM user_badges
        JOIN badges ON user_badges.badge_code = badges.code
        WHERE user_badges.user_id = ?
        ORDER BY user_badges.earned_at DESC
    """, (current_user.id,)).fetchall()

    connection.close()

    return render_template('profile.html', badges=earned_badges)

@app.context_processor
def inject_pending_count():
    if current_user.is_authenticated and current_user.is_admin:
        connection = get_db_connection()
        count = connection.execute("SELECT COUNT(*) FROM pending_spots").fetchone()[0]
        connection.close()
        return {"pending_count": count}
    return {"pending_count": 0}

TRACKED_PATHS = {"/", "/about", "/map", "/leaderboard", "/profile", "/signup", "/login"}

@app.before_request
def track_page_visit():
    if request.path in TRACKED_PATHS:
        connection = get_db_connection()
        user_id = current_user.id if current_user.is_authenticated else None
        connection.execute(
            "INSERT INTO page_visits (path, user_id) VALUES (?, ?)",
            (request.path, user_id)
        )
        connection.commit()
        connection.close()

@app.route("/admin/stats")
@admin_required
def admin_stats():
    connection = get_db_connection()

    total_users = connection.execute("SELECT COUNT(*) FROM users WHERE is_admin = 0").fetchone()[0]

    returning_users = connection.execute(
        "SELECT COUNT(*) FROM users WHERE login_count > 1 AND is_admin = 0"
    ).fetchone()[0]

    new_accounts_week = connection.execute(
        "SELECT COUNT(*) FROM users WHERE created_at >= datetime('now', '-7 days') AND is_admin = 0"
    ).fetchone()[0]

    total_visits = connection.execute("SELECT COUNT(*) FROM page_visits").fetchone()[0]

    visits_today = connection.execute(
        "SELECT COUNT(*) FROM page_visits WHERE visited_at >= datetime('now', '-1 day')"
    ).fetchone()[0]

    visits_week = connection.execute(
        "SELECT COUNT(*) FROM page_visits WHERE visited_at >= datetime('now', '-7 days')"
    ).fetchone()[0]

    total_spots = connection.execute("SELECT COUNT(*) FROM study_spots").fetchone()[0]
    total_reviews = connection.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]
    total_likes = connection.execute("SELECT COUNT(*) FROM likes").fetchone()[0]
    total_feedback = connection.execute("SELECT COUNT(*) FROM feedback").fetchone()[0]

    top_contributor = connection.execute(
        "SELECT username, points FROM users WHERE is_admin = 0 ORDER BY points DESC LIMIT 1"
    ).fetchone()

    most_liked_spot = connection.execute("""
        SELECT study_spots.name, COUNT(likes.id) as like_count
        FROM study_spots
        LEFT JOIN likes ON likes.spot_id = study_spots.id
        GROUP BY study_spots.id
        ORDER BY like_count DESC
        LIMIT 1
    """).fetchone()

    pending_spots_count = connection.execute("SELECT COUNT(*) FROM pending_spots").fetchone()[0]
    pending_images_count = connection.execute("SELECT COUNT(*) FROM pending_images").fetchone()[0]

    connection.close()

    return render_template('admin_stats.html',
        total_users=total_users,
        returning_users=returning_users,
        new_accounts_week=new_accounts_week,
        total_visits=total_visits,
        visits_today=visits_today,
        visits_week=visits_week,
        total_spots=total_spots,
        total_reviews=total_reviews,
        total_likes=total_likes,
        total_feedback=total_feedback,
        top_contributor=top_contributor,
        most_liked_spot=most_liked_spot,
        pending_spots_count=pending_spots_count,
        pending_images_count=pending_images_count
    )

@app.route("/admin/users")
@admin_required
def admin_users():
    connection = get_db_connection()
    users = connection.execute(
        "SELECT id, username, email, points, is_admin, created_at FROM users ORDER BY created_at DESC"
    ).fetchall()
    connection.close()
    return render_template('admin_users.html', users=users)

@app.route("/submit_feedback", methods=["POST"])
@login_required
def submit_feedback():
    data = request.json
    message = data.get("message", "").strip()

    if not message:
        return jsonify({"error": "Feedback can't be empty."}), 400

    connection = get_db_connection()
    connection.execute(
        "INSERT INTO feedback (user_id, message) VALUES (?, ?)",
        (current_user.id, message)
    )
    connection.commit()
    connection.close()

    return jsonify({"message": "Thanks for the feedback!"})

@app.route("/admin/feedback")
@admin_required
def admin_feedback():
    connection = get_db_connection()
    feedback_list = connection.execute("""
        SELECT feedback.id, feedback.message, feedback.created_at, users.username
        FROM feedback
        LEFT JOIN users ON feedback.user_id = users.id
        ORDER BY feedback.created_at DESC
    """).fetchall()
    connection.close()
    return render_template('admin_feedback.html', feedback_list=feedback_list)


@app.route("/admin/feedback/delete/<int:feedback_id>", methods=["POST"])
@admin_required
def delete_feedback(feedback_id):
    connection = get_db_connection()
    connection.execute("DELETE FROM feedback WHERE id = ?", (feedback_id,))
    connection.commit()
    connection.close()
    return jsonify({"message": "Deleted"})

@app.route("/submit_spot_image/<int:spot_id>", methods=["POST"])
@login_required
def submit_spot_image(spot_id):
    if "image" not in request.files:
        return jsonify({"error": "No image file provided."}), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({"error": "No image selected."}), 400

    if not allowed_image(file.filename):
        return jsonify({"error": "Only PNG, JPG, GIF, or WEBP images are allowed."}), 400

    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    if file_size > MAX_IMAGE_SIZE:
        return jsonify({"error": "Image must be smaller than 5MB."}), 400

    original_extension = file.filename.rsplit(".", 1)[1].lower()
    unique_filename = f"{uuid.uuid4().hex}.{original_extension}"

    upload_path = os.path.join(BASE_DIR, "static", "images", "pending", unique_filename)
    file.save(upload_path)

    connection = get_db_connection()
    connection.execute(
        "INSERT INTO pending_images (spot_id, filename, submitted_by) VALUES (?, ?, ?)",
        (spot_id, unique_filename, current_user.id)
    )
    connection.commit()
    connection.close()

    return jsonify({"message": "Photo submitted for review! It'll appear once approved."})

@app.route("/admin/images")
@admin_required
def admin_images():
    connection = get_db_connection()
    pending = connection.execute("""
        SELECT pending_images.*, users.username, study_spots.name as spot_name
        FROM pending_images
        JOIN users ON pending_images.submitted_by = users.id
        JOIN study_spots ON pending_images.spot_id = study_spots.id
        ORDER BY pending_images.created_at ASC
    """).fetchall()
    connection.close()
    return render_template('admin_images.html', pending=pending)


@app.route("/admin/images/approve/<int:pending_id>", methods=["POST"])
@admin_required
def admin_approve_image(pending_id):
    connection = get_db_connection()
    pending_image = connection.execute(
        "SELECT * FROM pending_images WHERE id = ?", (pending_id,)
    ).fetchone()

    if pending_image is None:
        connection.close()
        return jsonify({"error": "Not found"}), 404

    spot = connection.execute(
        "SELECT images FROM study_spots WHERE id = ?", (pending_image["spot_id"],)
    ).fetchone()

    existing_images = spot["images"].split(",") if spot["images"] else []
    new_path = f"/static/images/{pending_image['filename']}"

    old_full_path = os.path.join(BASE_DIR, "static", "images", "pending", pending_image["filename"])
    new_full_path = os.path.join(BASE_DIR, "static", "images", pending_image["filename"])
    os.rename(old_full_path, new_full_path)

    existing_images.append(new_path)
    connection.execute(
        "UPDATE study_spots SET images = ? WHERE id = ?",
        (",".join(existing_images), pending_image["spot_id"])
    )

    connection.execute("DELETE FROM pending_images WHERE id = ?", (pending_id,))
    connection.commit()
    connection.close()

    return jsonify({"message": "Image approved"})

@app.route("/admin/images/reject/<int:pending_id>", methods=["POST"])
@admin_required
def admin_reject_image(pending_id):
    connection = get_db_connection()
    pending_image = connection.execute(
        "SELECT * FROM pending_images WHERE id = ?", (pending_id,)
    ).fetchone()

    if pending_image is not None:
        file_path = os.path.join(BASE_DIR, "static", "images", "pending", pending_image["filename"])
        if os.path.exists(file_path):
            os.remove(file_path)

        connection.execute("DELETE FROM pending_images WHERE id = ?", (pending_id,))
        connection.commit()

    connection.close()
    return jsonify({"message": "Image rejected"})

if __name__ == '__main__':
    app.run(debug=False)