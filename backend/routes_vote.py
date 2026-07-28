from flask import Blueprint, request, jsonify
from models import db, User, Vote, PollSettings
from datetime import datetime

vote_bp = Blueprint('vote_bp', __name__)

@vote_bp.route('/validate/<token>', methods=['GET'])
def validate_token(token):
    user = User.query.filter_by(token=token).first()
    if not user:
        return jsonify({'valid': False, 'error': 'Invalid or expired voting link.'}), 404

    poll = PollSettings.query.first()
    if poll and poll.is_closed:
        return jsonify({'valid': False, 'error': 'This poll has been closed by the administrator.'}), 400

    if user.has_voted:
        return jsonify({
            'valid': False, 
            'already_voted': True, 
            'error': 'You have already submitted your response.',
            'vote_time': user.vote_time.isoformat() if user.vote_time else None
        }), 400

    return jsonify({
        'valid': True,
        'user': {
            'email': user.email,
            'name': user.name
        },
        'poll': poll.to_dict() if poll else {
            'title': 'Rotation Schedule Preference Poll',
            'description': 'Choose your preferred rotation schedule.'
        }
    }), 200

@vote_bp.route('/submit', methods=['POST'])
def submit_vote():
    data = request.get_json() or {}
    token = data.get('token', '').strip()
    selected_option = data.get('selected_option', '').strip()

    if not token:
        return jsonify({'error': 'Voting token is missing.'}), 400

    if selected_option not in ['option_1', 'option_2']:
        return jsonify({'error': 'Please select a valid option (Option 1 or Option 2).'}), 400

    # Retrieve user by token
    user = User.query.filter_by(token=token).first()
    if not user:
        return jsonify({'error': 'Invalid voting token.'}), 404

    # Check poll status
    poll = PollSettings.query.first()
    if poll and poll.is_closed:
        return jsonify({'error': 'Voting has closed.'}), 400

    # Enforce 1-vote constraint
    if user.has_voted:
        return jsonify({'error': 'You have already submitted your response for this poll.'}), 400

    now = datetime.utcnow()

    # Record Vote
    vote = Vote(user_id=user.id, selected_option=selected_option, timestamp=now)
    db.session.add(vote)

    # Invalidate token & update user record
    user.has_voted = True
    user.vote_time = now

    db.session.commit()

    option_title = "Option 1 (Boys rotate for 3rd, 4th, 5th & 6th)" if selected_option == 'option_1' else "Option 2 (Boys rotate for 5th & 6th only)"

    return jsonify({
        'message': 'Your vote has been securely submitted!',
        'receipt': {
            'email': user.email,
            'selected_option': option_title,
            'timestamp': now.strftime('%Y-%m-%d %H:%M:%S UTC')
        }
    }), 200
