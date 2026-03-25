import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def _get_smtp_config():
    return {
        'host': os.environ.get('SMTP_HOST', ''),
        'port': int(os.environ.get('SMTP_PORT', '587')),
        'user': os.environ.get('SMTP_USER', ''),
        'password': os.environ.get('SMTP_PASSWORD', ''),
        'from_address': os.environ.get('MAIL_FROM_ADDRESS', 'noreply@spark10k.com'),
        'from_name': os.environ.get('MAIL_FROM_NAME', 'Spark10K'),
    }


def send_email(to, subject, html_body, text_body=None):
    """Send an email via SMTP. Returns True on success, False on failure."""
    config = _get_smtp_config()

    if not config['host'] or not config['user']:
        print(f"[EMAIL] SMTP not configured — would send to {to}: {subject}")
        return False

    msg = MIMEMultipart('alternative')
    msg['From'] = f"{config['from_name']} <{config['from_address']}>"
    msg['To'] = to
    msg['Subject'] = subject

    if text_body:
        msg.attach(MIMEText(text_body, 'plain'))
    msg.attach(MIMEText(html_body, 'html'))

    try:
        with smtplib.SMTP(config['host'], config['port']) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(config['user'], config['password'])
            server.sendmail(config['from_address'], to, msg.as_string())
        print(f"[EMAIL] Sent to {to}: {subject}")
        return True
    except Exception as e:
        print(f"[EMAIL] Failed to send to {to}: {e}")
        return False


def send_password_reset_email(to, reset_url):
    subject = "Reset Your Spark10K Password"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #1e293b; margin: 0;">Spark10K</h2>
            <p style="color: #64748b; font-size: 14px;">Learning Platform</p>
        </div>
        <h3 style="color: #1e293b;">Password Reset Request</h3>
        <p style="color: #475569; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password.
            This link expires in 1 hour.
        </p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_url}"
               style="background: linear-gradient(135deg, #0077B5, #005a8c); color: white; padding: 12px 32px;
                      border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                Reset Password
            </a>
        </div>
        <p style="color: #94a3b8; font-size: 13px;">
            If you didn't request this, you can safely ignore this email. Your password won't change.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            Spark10K — Empowering 10,000 students with Gen AI skills
        </p>
    </div>
    """
    return send_email(to, subject, html)


def send_verification_email(to, verify_url):
    subject = "Verify Your Spark10K Email"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #1e293b; margin: 0;">Spark10K</h2>
            <p style="color: #64748b; font-size: 14px;">Learning Platform</p>
        </div>
        <h3 style="color: #1e293b;">Verify Your Email</h3>
        <p style="color: #475569; line-height: 1.6;">
            Welcome to Spark10K! Please verify your email address by clicking the button below.
        </p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{verify_url}"
               style="background: linear-gradient(135deg, #0077B5, #005a8c); color: white; padding: 12px 32px;
                      border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                Verify Email
            </a>
        </div>
        <p style="color: #94a3b8; font-size: 13px;">
            If you didn't create an account, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            Spark10K — Empowering 10,000 students with Gen AI skills
        </p>
    </div>
    """
    return send_email(to, subject, html)


def send_welcome_email(to, username):
    subject = "Welcome to Spark10K!"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #1e293b; margin: 0;">Spark10K</h2>
            <p style="color: #64748b; font-size: 14px;">Learning Platform</p>
        </div>
        <h3 style="color: #1e293b;">Welcome, {username}!</h3>
        <p style="color: #475569; line-height: 1.6;">
            You're now part of India's largest free AI training initiative.
            Start exploring Gen AI courses, interactive notebooks, and earn certificates — all for free.
        </p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://lms.spark10k.com/dashboard"
               style="background: linear-gradient(135deg, #0077B5, #005a8c); color: white; padding: 12px 32px;
                      border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                Start Learning
            </a>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            Spark10K — Empowering 10,000 students with Gen AI skills
        </p>
    </div>
    """
    return send_email(to, subject, html)
