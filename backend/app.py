from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from models import db, Admin, PollSettings
from auth import hash_password
from routes_admin import admin_bp
from routes_vote import vote_bp

import os
from flask import send_from_directory

def create_app():
    dist_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist'))
    app = Flask(__name__, static_folder=dist_folder, static_url_path='')
    app.config.from_object(Config)

    # Enable CORS for all routes (for React frontend)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # JWT Initialization
    jwt = JWTManager(app)

    # Database Initialization
    db.init_app(app)

    # Register Blueprints
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(vote_bp, url_prefix='/api/vote')

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'online', 'service': 'Secure Rotation Voting API'}), 200

    # Catch-all route to serve React frontend SPA
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')

    # Auto-create tables & default admin user
    with app.app_context():
        db.create_all()

        # Check and alter poll_settings table columns if needed
        try:
            with db.engine.connect() as conn:
                from sqlalchemy import text
                try:
                    conn.execute(text("ALTER TABLE poll_settings ADD COLUMN email_subject VARCHAR(250) DEFAULT 'Rotation Schedule Preference Voting Invitation'"))
                    conn.commit()
                except Exception:
                    pass
                try:
                    conn.execute(text("ALTER TABLE poll_settings ADD COLUMN custom_message TEXT DEFAULT 'Hello! You are invited to participate in the rotation schedule preference voting poll.'"))
                    conn.commit()
                except Exception:
                    pass
        except Exception as e:
            print("[MIGRATION LOG]", e)

        # Seed default admin if missing
        if not Admin.query.filter_by(username='admin').first():
            default_admin = Admin(
                username='admin',
                password_hash=hash_password('admin123')
            )
            db.session.add(default_admin)
            print("[INIT] Default admin created: username='admin', password='admin123'")

        # Seed default PollSettings if missing
        if not PollSettings.query.first():
            default_poll = PollSettings(
                title="Rotation Schedule Preference Poll",
                description="Please choose your preference for the boys & girls rotation schedule.",
                is_closed=False,
                email_subject="Rotation Schedule Preference Voting Invitation",
                custom_message="Hello! You are invited to participate in the rotation schedule preference voting poll."
            )
            db.session.add(default_poll)
            print("[INIT] Default poll settings initialized.")

        db.session.commit()

    return app

app = create_app()

if __name__ == '__main__':
    print("Starting Secure Rotation Voting API Server on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
