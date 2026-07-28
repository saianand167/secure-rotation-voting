from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid

db = SQLAlchemy()

class Admin(db.Model):
    __tablename__ = 'admins'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'created_at': self.created_at.isoformat()
        }

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=True)
    email = db.Column(db.String(150), unique=True, nullable=False, index=True)
    token = db.Column(db.String(64), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    invitation_sent = db.Column(db.Boolean, default=False)
    has_voted = db.Column(db.Boolean, default=False)
    vote_time = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    votes = db.relationship('Vote', backref='voter', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name or '',
            'email': self.email,
            'token': self.token,
            'invitation_sent': self.invitation_sent,
            'has_voted': self.has_voted,
            'vote_time': self.vote_time.isoformat() if self.vote_time else None,
            'created_at': self.created_at.isoformat()
        }

class Vote(db.Model):
    __tablename__ = 'votes'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    selected_option = db.Column(db.String(50), nullable=False)  # 'option_1' or 'option_2'
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'selected_option': self.selected_option,
            'timestamp': self.timestamp.isoformat()
        }

class PollSettings(db.Model):
    __tablename__ = 'poll_settings'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), default="Rotation Schedule Preference Poll")
    description = db.Column(db.Text, default="Choose your preferred schedule for boys & girls rotation.")
    is_closed = db.Column(db.Boolean, default=False)
    closing_time = db.Column(db.DateTime, nullable=True)
    email_subject = db.Column(db.String(250), default="Rotation Schedule Preference Voting Invitation")
    custom_message = db.Column(db.Text, default="Hello! You are invited to participate in the rotation schedule preference voting poll. Please click the button below to submit your choice.")

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'is_closed': self.is_closed,
            'closing_time': self.closing_time.isoformat() if self.closing_time else None,
            'email_subject': self.email_subject,
            'custom_message': self.custom_message
        }

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    admin_username = db.Column(db.String(80), nullable=False)
    action = db.Column(db.String(255), nullable=False)
    details = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'admin_username': self.admin_username,
            'action': self.action,
            'details': self.details,
            'timestamp': self.timestamp.isoformat()
        }
