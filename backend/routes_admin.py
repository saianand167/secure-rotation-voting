from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Admin, User, Vote, PollSettings, AuditLog
from auth import hash_password, verify_password, generate_admin_token
from email_service import send_invitation_email, send_batch_invitation_emails
import csv
import io
from datetime import datetime

admin_bp = Blueprint('admin_bp', __name__)

def log_admin_action(admin_username, action, details=None):
    log = AuditLog(admin_username=admin_username, action=action, details=details)
    db.session.add(log)
    db.session.commit()

@admin_bp.route('/login', methods=['POST'])
def admin_login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400

    admin = Admin.query.filter_by(username=username).first()
    if not admin or not verify_password(password, admin.password_hash):
        return jsonify({'error': 'Invalid admin credentials.'}), 401

    token = generate_admin_token(admin.username)
    log_admin_action(admin.username, "Admin Login", f"Logged in from IP {request.remote_addr}")
    
    return jsonify({
        'message': 'Login successful',
        'access_token': token,
        'username': admin.username
    }), 200

@admin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    total_invited = User.query.count()
    emails_sent = User.query.filter_by(invitation_sent=True).count()
    votes_received = User.query.filter_by(has_voted=True).count()
    pending_votes = total_invited - votes_received

    opt1_count = Vote.query.filter_by(selected_option='option_1').count()
    opt2_count = Vote.query.filter_by(selected_option='option_2').count()

    opt1_pct = round((opt1_count / votes_received * 100), 1) if votes_received > 0 else 0.0
    opt2_pct = round((opt2_count / votes_received * 100), 1) if votes_received > 0 else 0.0
    turnout_pct = round((votes_received / total_invited * 100), 1) if total_invited > 0 else 0.0

    recent_votes = Vote.query.order_by(Vote.timestamp.desc()).limit(10).all()
    poll = PollSettings.query.first()

    return jsonify({
        'total_invited': total_invited,
        'emails_sent': emails_sent,
        'votes_received': votes_received,
        'pending_votes': pending_votes,
        'opt1_count': opt1_count,
        'opt2_count': opt2_count,
        'opt1_pct': opt1_pct,
        'opt2_pct': opt2_pct,
        'turnout_pct': turnout_pct,
        'poll': poll.to_dict() if poll else {},
        'recent_votes': [v.to_dict() for v in recent_votes]
    }), 200

@admin_bp.route('/whitelist', methods=['GET'])
@jwt_required()
def get_whitelist():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users]), 200

@admin_bp.route('/whitelist', methods=['POST'])
@jwt_required()
def add_whitelist_single():
    current_admin = get_jwt_identity()
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    name = data.get('name', '').strip()

    if not email or '@' not in email:
        return jsonify({'error': 'Valid email is required.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': f'Email "{email}" is already in the whitelist.'}), 400

    user = User(email=email, name=name)
    db.session.add(user)
    db.session.commit()

    log_admin_action(current_admin, "Added Whitelist Email", f"Added: {email}")
    return jsonify({'message': 'Email added successfully', 'user': user.to_dict()}), 201

@admin_bp.route('/whitelist/upload', methods=['POST'])
@jwt_required()
def upload_whitelist_csv():
    current_admin = get_jwt_identity()
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded.'}), 400

    file = request.files['file']
    filename = file.filename.lower()
    if not filename.endswith('.csv') and not filename.endswith('.xlsx'):
        return jsonify({'error': 'Please upload a valid CSV or Excel file.'}), 400

    try:
        rows = []
        if filename.endswith('.csv'):
            content = file.stream.read().decode('utf-8-sig', errors='replace')
            reader = csv.reader(io.StringIO(content))
            rows = [row for row in reader if any(field.strip() for field in row)]
        else:
            import openpyxl
            wb = openpyxl.load_workbook(file)
            sheet = wb.active
            for row in sheet.iter_rows(values_only=True):
                if any(row):
                    rows.append([str(cell or '').strip() for cell in row])

        if not rows:
            return jsonify({'error': 'The uploaded file is empty.'}), 400

        headers = [str(h).strip().lower() for h in rows[0]]
        email_idx = -1
        name_idx = -1

        for idx, h in enumerate(headers):
            if 'email' in h:
                email_idx = idx
            elif 'name' in h:
                name_idx = idx

        if email_idx == -1:
            email_idx = 0
        if name_idx == -1 and len(headers) > 1:
            name_idx = 1 if email_idx != 1 else 0

        added_count = 0
        skipped_count = 0

        for row in rows[1:]:
            if not row or len(row) <= email_idx:
                continue
            email = str(row[email_idx]).strip().lower()
            name = str(row[name_idx]).strip() if name_idx != -1 and len(row) > name_idx else ''

            if email and '@' in email and not User.query.filter_by(email=email).first():
                u = User(email=email, name=name)
                db.session.add(u)
                added_count += 1
            else:
                skipped_count += 1

        db.session.commit()
        log_admin_action(current_admin, "Uploaded CSV Whitelist", f"Added {added_count} emails, skipped {skipped_count}")

        return jsonify({
            'message': f'Imported {added_count} emails successfully ({skipped_count} skipped/duplicates).',
            'added_count': added_count,
            'skipped_count': skipped_count
        }), 200

    except Exception as e:
        return jsonify({'error': f'Failed to process file: {str(e)}'}), 500

@admin_bp.route('/whitelist/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_whitelist_user(user_id):
    current_admin = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    email = user.email
    db.session.delete(user)
    db.session.commit()
    log_admin_action(current_admin, "Deleted Whitelist User", f"Removed: {email}")
    return jsonify({'message': f'User {email} removed.'}), 200

@admin_bp.route('/email-settings', methods=['POST'])
@jwt_required()
def update_email_settings():
    current_admin = get_jwt_identity()
    poll = PollSettings.query.first()
    if not poll:
        poll = PollSettings()
        db.session.add(poll)

    data = request.get_json() or {}
    if 'email_subject' in data:
        poll.email_subject = data['email_subject'].strip()
    if 'custom_message' in data:
        poll.custom_message = data['custom_message'].strip()

    db.session.commit()
    log_admin_action(current_admin, "Updated Custom Email Settings", f"Subject: {poll.email_subject}")
    return jsonify({'message': 'Email message settings updated successfully!', 'poll': poll.to_dict()}), 200

@admin_bp.route('/send-invitations', methods=['POST'])
@jwt_required()
def send_invitations():
    current_admin = get_jwt_identity()
    poll = PollSettings.query.first()
    data = request.get_json() or {}
    target_user_ids = data.get('user_ids', None)  # Optional target IDs array
    send_all = data.get('send_all', False)  # If True, send to ALL users regardless of status

    subject = data.get('email_subject') or (poll.email_subject if poll else None)
    custom_msg = data.get('custom_message') or (poll.custom_message if poll else None)

    if target_user_ids:
        users = User.query.filter(User.id.in_(target_user_ids)).all()
    elif send_all:
        users = User.query.all()  # Send to ALL whitelisted users
    else:
        users = User.query.filter_by(invitation_sent=False).all()

    if not users:
        return jsonify({'message': 'No users to send invitations to.'}), 200

    recipients = [{'email': u.email, 'name': u.name, 'token': u.token, 'user_obj': u} for u in users]
    sent_count, failed_count, status_msg = send_batch_invitation_emails(recipients, custom_subject=subject, custom_message=custom_msg)

    # Mark users as invitation_sent
    if sent_count > 0:
        for u in users:
            u.invitation_sent = True
        db.session.commit()

    log_admin_action(current_admin, "Sent Invitations", f"Sent {sent_count} invitations to {'ALL' if send_all else 'pending'}, {failed_count} failed")

    return jsonify({
        'message': f'Sent {sent_count} email invitations successfully ({failed_count} failed). Status: {status_msg}',
        'sent_count': sent_count,
        'failed_count': failed_count
    }), 200

@admin_bp.route('/poll-status', methods=['POST'])
@jwt_required()
def toggle_poll_status():
    current_admin = get_jwt_identity()
    poll = PollSettings.query.first()
    if not poll:
        poll = PollSettings()
        db.session.add(poll)

    data = request.get_json() or {}
    if 'is_closed' in data:
        poll.is_closed = bool(data['is_closed'])
    
    db.session.commit()
    status_text = "Closed" if poll.is_closed else "Open"
    log_admin_action(current_admin, "Toggled Poll Status", f"Poll is now {status_text}")
    return jsonify({'message': f'Poll is now {status_text}.', 'poll': poll.to_dict()}), 200

@admin_bp.route('/template/csv', methods=['GET'])
def download_sample_csv():
    csv_data = "email,name\nstudent1@rguktn.ac.in,John Doe\nstudent2@gmail.com,Jane Smith\n"
    output = io.BytesIO()
    output.write(csv_data.encode('utf-8'))
    output.seek(0)
    return send_file(
        output,
        mimetype='text/csv',
        as_attachment=True,
        download_name='sample_voters_template.csv'
    )

@admin_bp.route('/export/csv', methods=['GET'])
@jwt_required()
def export_results_csv():
    votes = Vote.query.all()
    data = []
    for v in votes:
        opt_text = "Option 1 (Boys rotate 3,4,5,6)" if v.selected_option == 'option_1' else "Option 2 (Boys rotate 5,6)"
        data.append({
            'Vote ID': v.id,
            'Voter Email': v.voter.email if v.voter else 'Anonymous',
            'Voter Name': v.voter.name if v.voter else '',
            'Selected Option': opt_text,
            'Timestamp': v.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        })

    df = pd.DataFrame(data if data else [{'Vote ID': '', 'Voter Email': '', 'Voter Name': '', 'Selected Option': '', 'Timestamp': ''}])
    output = io.BytesIO()
    df.to_csv(output, index=False)
    output.seek(0)

    return send_file(
        output,
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'rotation_poll_results_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    )

@admin_bp.route('/audit-logs', methods=['GET'])
@jwt_required()
def get_audit_logs():
    logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(50).all()
    return jsonify([l.to_dict() for l in logs]), 200
