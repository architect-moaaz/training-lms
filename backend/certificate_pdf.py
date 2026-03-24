"""Generate certificate PDFs with Spark10K branding using ReportLab."""
import io
import os
import urllib.request
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


# Spark10K brand colors
SPARK_BLUE = '#0077B5'
SPARK_DARK = '#005a8c'
LOGO_URL = 'https://spark10k.com/logo.png'

# Cache logo in memory
_logo_cache = None


def _get_logo():
    """Download and cache the Spark10K logo."""
    global _logo_cache
    if _logo_cache is not None:
        return _logo_cache
    try:
        req = urllib.request.Request(LOGO_URL, headers={'User-Agent': 'Mozilla/5.0'})
        response = urllib.request.urlopen(req, timeout=10)
        _logo_cache = ImageReader(io.BytesIO(response.read()))
        return _logo_cache
    except Exception as e:
        print(f"Could not load logo: {e}")
        return None


def generate_certificate_pdf(user_name, certificate_title, cert_id, issued_date, description=''):
    """Generate a Spark10K branded certificate PDF and return it as bytes."""
    buffer = io.BytesIO()
    width, height = landscape(A4)
    c = canvas.Canvas(buffer, pagesize=landscape(A4))

    # Colors
    bg_color = HexColor('#0a1628')
    border_color = HexColor(SPARK_BLUE)
    accent_color = HexColor('#00a5ff')
    gold_color = HexColor('#c9a84c')
    text_color = HexColor('#f8fafc')
    subtle_color = HexColor('#94a3b8')

    # Background
    c.setFillColor(bg_color)
    c.rect(0, 0, width, height, fill=1, stroke=0)

    # Subtle gradient overlay at top
    for i in range(60):
        alpha = 0.03 * (1 - i / 60)
        c.setFillColor(HexColor(SPARK_BLUE))
        c.setFillAlpha(alpha)
        c.rect(0, height - i * 2, width, 2, fill=1, stroke=0)
    c.setFillAlpha(1)

    # Decorative border
    c.setStrokeColor(border_color)
    c.setLineWidth(2)
    margin = 30
    c.roundRect(margin, margin, width - 2 * margin, height - 2 * margin, 10, fill=0, stroke=1)

    # Inner decorative line
    c.setStrokeColor(HexColor('#1e3a5f'))
    c.setLineWidth(0.5)
    inner = 45
    c.roundRect(inner, inner, width - 2 * inner, height - 2 * inner, 8, fill=0, stroke=1)

    # Spark10K Logo at top
    logo = _get_logo()
    if logo:
        try:
            logo_width = 120
            logo_height = 40
            c.drawImage(logo, width / 2 - logo_width / 2, height - 95, width=logo_width, height=logo_height,
                       preserveAspectRatio=True, mask='auto')
        except Exception:
            # Fallback: text logo
            c.setFillColor(HexColor(SPARK_BLUE))
            c.setFont('Helvetica-Bold', 18)
            c.drawCentredString(width / 2, height - 85, 'SPARK10K')
    else:
        c.setFillColor(HexColor(SPARK_BLUE))
        c.setFont('Helvetica-Bold', 18)
        c.drawCentredString(width / 2, height - 85, 'SPARK10K')

    # Top accent line
    c.setStrokeColor(accent_color)
    c.setLineWidth(2)
    line_y = height - 110
    c.line(width / 2 - 80, line_y, width / 2 + 80, line_y)

    # "CERTIFICATE OF COMPLETION"
    c.setFillColor(gold_color)
    c.setFont('Helvetica', 11)
    c.drawCentredString(width / 2, height - 135, 'CERTIFICATE OF COMPLETION')

    # Certificate title
    c.setFillColor(text_color)
    c.setFont('Helvetica-Bold', 26)
    # Handle long titles
    if c.stringWidth(certificate_title, 'Helvetica-Bold', 26) > 500:
        c.setFont('Helvetica-Bold', 22)
    c.drawCentredString(width / 2, height - 175, certificate_title)

    # "This certifies that"
    c.setFillColor(subtle_color)
    c.setFont('Helvetica', 12)
    c.drawCentredString(width / 2, height - 215, 'This certifies that')

    # User name
    c.setFillColor(text_color)
    c.setFont('Helvetica-Bold', 30)
    if c.stringWidth(user_name, 'Helvetica-Bold', 30) > 450:
        c.setFont('Helvetica-Bold', 24)
    c.drawCentredString(width / 2, height - 255, user_name)

    # Decorative line under name
    c.setStrokeColor(HexColor(SPARK_BLUE))
    c.setLineWidth(1)
    c.line(width / 2 - 130, height - 270, width / 2 + 130, height - 270)

    # Description
    c.setFillColor(subtle_color)
    c.setFont('Helvetica', 11)
    if description:
        lines = []
        words = description.split()
        line = ''
        for word in words:
            test = f'{line} {word}'.strip()
            if c.stringWidth(test, 'Helvetica', 11) < 480:
                line = test
            else:
                lines.append(line)
                line = word
        if line:
            lines.append(line)
        y = height - 298
        for l in lines[:3]:
            c.drawCentredString(width / 2, y, l)
            y -= 16
    else:
        c.drawCentredString(width / 2, height - 298,
                           'has successfully completed all requirements for this certification.')

    # Mission tagline
    c.setFillColor(HexColor('#475569'))
    c.setFont('Helvetica-Oblique', 9)
    c.drawCentredString(width / 2, height - 345,
                       'Empowering 10,000 students across India with cutting-edge Gen AI skills')

    # Bottom section
    bottom_y = 95

    # Issue date
    c.setFillColor(subtle_color)
    c.setFont('Helvetica', 9)
    c.drawCentredString(width / 4, bottom_y + 18, 'Date Issued')
    c.setFillColor(text_color)
    c.setFont('Helvetica-Bold', 11)
    c.drawCentredString(width / 4, bottom_y, issued_date)

    # Certificate ID
    c.setFillColor(subtle_color)
    c.setFont('Helvetica', 9)
    c.drawCentredString(width / 2, bottom_y + 18, 'Certificate ID')
    c.setFillColor(accent_color)
    c.setFont('Helvetica-Bold', 11)
    c.drawCentredString(width / 2, bottom_y, cert_id)

    # Issued by
    c.setFillColor(subtle_color)
    c.setFont('Helvetica', 9)
    c.drawCentredString(3 * width / 4, bottom_y + 18, 'Issued by')
    c.setFillColor(HexColor(SPARK_BLUE))
    c.setFont('Helvetica-Bold', 11)
    c.drawCentredString(3 * width / 4, bottom_y, 'Spark10K')

    # Bottom accent line
    c.setStrokeColor(HexColor(SPARK_BLUE))
    c.setLineWidth(2)
    c.line(width / 2 - 80, 65, width / 2 + 80, 65)

    # Verification URL
    c.setFillColor(HexColor('#334155'))
    c.setFont('Helvetica', 7)
    c.drawCentredString(width / 2, 50, f'Verify at spark10k.com/verify/{cert_id}')

    c.save()
    buffer.seek(0)
    return buffer.getvalue()
