import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'secure_rotation_voting_secret_key_2026')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt_secret_rotation_voting_2026')
    
    # SQLite default, or MySQL/PostgreSQL if set in env
    _db_url = os.getenv('DATABASE_URL', f'sqlite:///{os.path.join(BASE_DIR, "rotation_voting.db")}')
    if _db_url.startswith("postgres://"):
        _db_url = _db_url.replace("postgres://", "postgresql+pg8000://", 1)
    elif _db_url.startswith("postgresql://") and not _db_url.startswith("postgresql+"):
        _db_url = _db_url.replace("postgresql://", "postgresql+pg8000://", 1)
    
    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Gmail SMTP Settings
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv('GMAIL_USER', '')
    MAIL_PASSWORD = os.getenv('GMAIL_APP_PASSWORD', '')
    
    @classmethod
    def get_frontend_url(cls):
        # First check if public_url.txt exists and has a valid URL
        pub_file = os.path.join(BASE_DIR, 'public_url.txt')
        if os.path.exists(pub_file):
            with open(pub_file, 'r') as f:
                url = f.read().strip()
                if url.startswith('http'):
                    return url
        load_dotenv(override=True)
        return os.getenv('FRONTEND_URL', 'http://localhost:3000')

