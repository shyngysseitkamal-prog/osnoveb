import sqlite3
import os
import re
from flask import Flask, render_template, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

app.secret_key = os.environ.get('SECRET_KEY', 'career_project_secret_key_123')
DB_NAME = 'career.db'

EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
MAX_IMAGE_LEN = 2_800_000  
MAX_POST_LEN = 3000


def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL DEFAULT 'Abylai B',
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'Frontend Developer',
            location TEXT DEFAULT 'Almaty, KZ',
            about TEXT DEFAULT 'Passionate developer building high-quality web products.',
            avatar TEXT DEFAULT ''
        )
    ''')

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass

    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vacancies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            company TEXT NOT NULL,
            location TEXT NOT NULL,
            type TEXT NOT NULL,
            salary INTEGER NOT NULL,
            category TEXT NOT NULL
        )
    ''')

    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            vacancy_id INTEGER NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, vacancy_id),
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(vacancy_id) REFERENCES vacancies(id)
        )
    ''')

    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            author_name TEXT NOT NULL,
            author_role TEXT NOT NULL,
            author_avatar TEXT DEFAULT '',
            content TEXT NOT NULL,
            image TEXT DEFAULT '',
            likes INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    try:
        cursor.execute("ALTER TABLE posts ADD COLUMN image TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass

    
    cursor.execute("SELECT COUNT(*) FROM vacancies")
    if cursor.fetchone()[0] == 0:
        sample_jobs = [
            ("Senior React Engineer", "Linear", "Remote", "Full-time", 4500, "IT & Dev"),
            ("Lead Product Designer", "Apple", "San Francisco", "Full-time", 5500, "Design"),
            ("Growth Marketing Lead", "Vercel", "New York", "Full-time", 3500, "Marketing"),
            ("Frontend Specialist", "Stripe", "San Francisco", "Full-time", 4200, "IT & Dev"),
            ("Account Executive", "Slack", "London", "Part-time", 2100, "Sales"),
            ("Financial Analyst", "Revolut", "London", "Full-time", 3800, "Finance"),
            ("HR Business Partner", "Figma", "San Francisco", "Full-time", 3200, "HR"),
            ("React Native Developer", "Airbnb", "Remote", "Contract", 4800, "IT & Dev"),
            ("UX Researcher", "Google", "London", "Full-time", 4000, "Design"),
            ("Sales Representative", "Notion", "Remote", "Contract", 1500, "Sales")
        ]
        cursor.executemany(
            "INSERT INTO vacancies (title, company, location, type, salary, category) VALUES (?, ?, ?, ?, ?, ?)",
            sample_jobs
        )

    
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        default_password = generate_password_hash("password123")
        cursor.execute('''
            INSERT INTO users (name, email, password_hash, role, location, about, avatar)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', ('Abylai B', 'test@example.com', default_password, 'Frontend Developer', 'Almaty, KZ',
              'Passionate developer building high-quality web products.', ''))

    
    cursor.execute("SELECT COUNT(*) FROM posts")
    if cursor.fetchone()[0] == 0:
        sample_posts = [
            (1, "Alex Morgan", "Staff Designer at Linear", "",
             "We just launched our new design system tokens! Super excited about how clean and fluid the desktop "
             "interactions feel now. What is your favourite UI detail this year? 🚀", 14),
            (1, "Sarah Chen", "Tech Lead at Vercel", "",
             "We are looking for 2 Senior Frontend Engineers to join our core team. Remote-first, competitive "
             "compensation and great culture. Check our vacancies tab or reach out directly! ⚡", 29)
        ]
        cursor.executemany(
            "INSERT INTO posts (user_id, author_name, author_role, author_avatar, content, likes) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            sample_posts
        )

    conn.commit()
    conn.close()


def current_user_id():
    


    return session.get('user_id')



@app.route('/')
def index():
    return render_template('index.html')



@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({"status": "error", "message": "Please fill in all fields."}), 400

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()

    if user and check_password_hash(user['password_hash'], password):
        session['user_id'] = user['id']
        return jsonify({
            "status": "success",
            "user": {
                "id": user['id'],
                "name": user['name'],
                "email": user['email'],
                "role": user['role'],
                "location": user['location'],
                "about": user['about'],
                "avatar": user['avatar']
            }
        })

    
    return jsonify({"status": "error", "message": "Invalid email or password."}), 401


@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip() or 'Abylai B'
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({"status": "error", "message": "Please fill in all fields."}), 400
    if not EMAIL_RE.match(email):
        return jsonify({"status": "error", "message": "Please enter a valid email address."}), 400
    if len(password) < 6:
        return jsonify({"status": "error", "message": "Password must be at least 6 characters."}), 400

    conn = get_db()
    try:
        hashed = generate_password_hash(password)
        cursor = conn.cursor()
        cursor.execute('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', (name, email, hashed))
        user_id = cursor.lastrowid
        conn.commit()
        session['user_id'] = user_id
        return jsonify({
            "status": "success",
            "user": {
                "id": user_id,
                "name": name,
                "email": email,
                "role": "Frontend Developer",
                "location": "Almaty, KZ",
                "about": "Passionate developer building high-quality web products.",
                "avatar": ""
            }
        })
    except sqlite3.IntegrityError:
        return jsonify({"status": "error", "message": "An account with this email already exists."}), 400
    finally:
        conn.close()


@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({"status": "success"})


@app.route('/api/me', methods=['GET'])
def get_me():
    user_id = current_user_id()
    if not user_id:
        return jsonify({})  

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()

    if user:
        return jsonify({
            "id": user['id'],
            "name": user['name'],
            "email": user['email'],
            "role": user['role'],
            "location": user['location'],
            "about": user['about'],
            "avatar": user['avatar'] if 'avatar' in user.keys() else ''
        })
    return jsonify({})


@app.route('/api/profile', methods=['PUT'])
def update_profile():
    user_id = current_user_id()
    if not user_id:
        return jsonify({"status": "error", "message": "Please log in to update your profile."}), 401

    data = request.get_json() or {}
    name = (data.get('name') or '').strip() or 'Abylai B'
    role = (data.get('role') or '').strip()
    location = (data.get('location') or '').strip()
    about = (data.get('about') or '').strip()
    avatar = data.get('avatar', '') or ''

    if not role or not location:
        return jsonify({"status": "error", "message": "Role and location are required."}), 400
    if len(avatar) > MAX_IMAGE_LEN:
        return jsonify({"status": "error", "message": "Avatar image is too large (max ~2MB)."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE users
        SET name = ?, role = ?, location = ?, about = ?, avatar = ?
        WHERE id = ?
    ''', (name, role, location, about, avatar, user_id))
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": "Profile updated"})



@app.route('/api/vacancies', methods=['GET'])
def get_vacancies():
    conn = get_db()
    vacancies = conn.execute("SELECT * FROM vacancies").fetchall()
    conn.close()
    return jsonify([dict(v) for v in vacancies])


@app.route('/api/apply', methods=['POST'])
def apply_job():
    user_id = current_user_id()
    if not user_id:
        return jsonify({"status": "error", "message": "Please log in to apply."}), 401

    data = request.get_json() or {}
    vacancy_id = data.get('vacancy_id')

    if not vacancy_id:
        return jsonify({"status": "error", "message": "Missing vacancy ID"}), 400

    conn = get_db()
    vacancy = conn.execute("SELECT id FROM vacancies WHERE id = ?", (vacancy_id,)).fetchone()
    if not vacancy:
        conn.close()
        return jsonify({"status": "error", "message": "Vacancy not found"}), 404

    try:
        cursor = conn.cursor()
        cursor.execute('INSERT INTO applications (user_id, vacancy_id) VALUES (?, ?)', (user_id, vacancy_id))
        conn.commit()
        return jsonify({"status": "success", "message": "Application sent!"})
    except sqlite3.IntegrityError:
        return jsonify({"status": "error", "message": "You already applied to this role."}), 400
    finally:
        conn.close()



@app.route('/api/posts', methods=['GET'])
def get_posts():
    conn = get_db()
    posts = conn.execute("SELECT * FROM posts ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(p) for p in posts])


@app.route('/api/posts', methods=['POST'])
def create_post():
    user_id = current_user_id()
    if not user_id:
        return jsonify({"status": "error", "message": "Please log in to post."}), 401

    data = request.get_json() or {}
    content = (data.get('content') or '').strip()
    image = data.get('image', '') or ''

    if not content and not image:
        return jsonify({"status": "error", "message": "Post cannot be empty"}), 400
    if len(content) > MAX_POST_LEN:
        return jsonify({"status": "error", "message": "Post is too long."}), 400
    if len(image) > MAX_IMAGE_LEN:
        return jsonify({"status": "error", "message": "Image is too large (max ~2MB)."}), 400

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

    author_name = user['name'] if user else 'Abylai B'
    author_role = user['role'] if user else 'Frontend Developer'
    author_avatar = user['avatar'] if user and 'avatar' in user.keys() else ''

    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO posts (user_id, author_name, author_role, author_avatar, content, image)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (user_id, author_name, author_role, author_avatar, content, image))
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": "Post created successfully"})


@app.route('/api/posts/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    user_id = current_user_id()
    if not user_id:
        return jsonify({"status": "error", "message": "Please log in."}), 401

    conn = get_db()
    post = conn.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
    if not post:
        conn.close()
        return jsonify({"status": "error", "message": "Post not found"}), 404
    if post['user_id'] != user_id:
        conn.close()
        return jsonify({"status": "error", "message": "You can only delete your own posts."}), 403

    conn.execute("DELETE FROM posts WHERE id = ?", (post_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Post deleted"})


@app.route('/api/posts/<int:post_id>/like', methods=['POST'])
def like_post(post_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE posts SET likes = likes + 1 WHERE id = ?", (post_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "success"})


if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)