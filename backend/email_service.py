import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import Config

def send_invitation_email(recipient_email, recipient_name, token, custom_subject=None, custom_message=None):
    vote_url = f"{Config.get_frontend_url()}/vote/{token}"
    
    subject = custom_subject if custom_subject else "Rotation Schedule Voting Invitation"
    name_display = recipient_name if recipient_name else "Student"

    message_content = custom_message if custom_message else "You are invited to participate in the official rotation schedule preference voting poll. Please click the button below to record your vote."

    body_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; }}
            .email-card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }}
            .header {{ background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }}
            .content {{ padding: 20px 0; color: #1e293b; line-height: 1.6; }}
            .custom-msg-box {{ background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px; white-space: pre-wrap; font-size: 14px; }}
            .btn {{ display: inline-block; background-color: #2563eb; color: #ffffff !important; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px; margin: 15px 0; }}
            .footer {{ font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 20px; }}
            .token-info {{ background: #eff6ff; border-left: 4px solid #3b82f6; padding: 10px 15px; font-size: 13px; color: #1e40af; margin-top: 15px; }}
        </style>
    </head>
    <body>
        <div class="email-card">
            <div class="header">
                <h2>{subject}</h2>
            </div>
            <div class="content">
                <p>Hello <strong>{name_display}</strong>,</p>
                <div class="custom-msg-box">
                    {message_content}
                </div>
                <p style="text-align: center;">
                    <a href="{vote_url}" class="btn">Cast Your Vote Now &rarr;</a>
                </p>
                <div class="token-info">
                    🔒 <strong>Security Note:</strong> This voting link is unique to your email (<code>{recipient_email}</code>) and can be used <strong>only once</strong>.
                </div>
            </div>
            <div class="footer">
                <p>If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="{vote_url}">{vote_url}</a></p>
                <p>&copy; 2026 Rotation Voting System. Secure & Anonymous Voting.</p>
            </div>
        </div>
    </body>
    </html>
    """

    if not Config.MAIL_USERNAME or not Config.MAIL_PASSWORD:
        print(f"[LOCAL TEST MODE EMAIL] To: {recipient_email} | Link: {vote_url}")
        return True, "Email logged to server console (SMTP credentials not configured)."

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = Config.MAIL_USERNAME
        msg['To'] = recipient_email
        msg.attach(MIMEText(body_html, 'html'))

        with smtplib.SMTP(Config.MAIL_SERVER, Config.MAIL_PORT) as server:
            server.starttls()
            server.login(Config.MAIL_USERNAME, Config.MAIL_PASSWORD)
            server.sendmail(Config.MAIL_USERNAME, recipient_email, msg.as_string())

        return True, "Email sent successfully via Gmail SMTP."
    except Exception as e:
        print(f"[SMTP ERROR] {str(e)}")
        return False, f"SMTP Error: {str(e)}"
