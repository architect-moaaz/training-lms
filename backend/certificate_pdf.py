"""Generate certificate PDFs using ReportLab."""
import io
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch, cm
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle


def generate_certificate_pdf(user_name, certificate_title, cert_id, issued_date, description=''):
    """Generate a certificate PDF and return it as bytes."""
    buffer = io.BytesIO()
    width, height = landscape(A4)
    c = canvas.Canvas(buffer, pagesize=landscape(A4))

    # Colors
    bg_color = HexColor('#0f172a')  # slate-950
    border_color = HexColor('#6366f1')  # indigo-500
    gold_color = HexColor('#a78bfa')  # violet-400
    text_color = HexColor('#f8fafc')  # slate-50
    subtle_color = HexColor('#94a3b8')  # slate-400
    accent_color = HexColor('#818cf8')  # indigo-400

    # Background
    c.setFillColor(bg_color)
    c.rect(0, 0, width, height, fill=1, stroke=0)

    # Decorative border
    c.setStrokeColor(border_color)
    c.setLineWidth(2)
    margin = 30
    c.roundRect(margin, margin, width - 2 * margin, height - 2 * margin, 10, fill=0, stroke=1)

    # Inner decorative line
    c.setStrokeColor(HexColor('#1e293b'))
    c.setLineWidth(0.5)
    inner = 45
    c.roundRect(inner, inner, width - 2 * inner, height - 2 * inner, 8, fill=0, stroke=1)

    # Top decorative accent line
    c.setStrokeColor(accent_color)
    c.setLineWidth(3)
    line_y = height - 80
    c.line(width / 2 - 100, line_y, width / 2 + 100, line_y)

    # "CERTIFICATE OF COMPLETION" header
    c.setFillColor(gold_color)
    c.setFont('Helvetica', 12)
    c.drawCentredString(width / 2, height - 110, 'CERTIFICATE OF COMPLETION')

    # Certificate title
    c.setFillColor(text_color)
    c.setFont('Helvetica-Bold', 28)
    c.drawCentredString(width / 2, height - 160, certificate_title)

    # "This certifies that"
    c.setFillColor(subtle_color)
    c.setFont('Helvetica', 13)
    c.drawCentredString(width / 2, height - 210, 'This certifies that')

    # User name
    c.setFillColor(text_color)
    c.setFont('Helvetica-Bold', 32)
    c.drawCentredString(width / 2, height - 255, user_name)

    # Decorative line under name
    c.setStrokeColor(accent_color)
    c.setLineWidth(1)
    c.line(width / 2 - 150, height - 270, width / 2 + 150, height - 270)

    # Description
    c.setFillColor(subtle_color)
    c.setFont('Helvetica', 12)
    if description:
        # Wrap long descriptions
        lines = []
        words = description.split()
        line = ''
        for word in words:
            test = f'{line} {word}'.strip()
            if c.stringWidth(test, 'Helvetica', 12) < 500:
                line = test
            else:
                lines.append(line)
                line = word
        if line:
            lines.append(line)
        y = height - 300
        for l in lines[:3]:  # max 3 lines
            c.drawCentredString(width / 2, y, l)
            y -= 18
    else:
        c.drawCentredString(width / 2, height - 300, 'has successfully completed all requirements for this certificate.')

    # Bottom section
    bottom_y = 100

    # Issue date
    c.setFillColor(subtle_color)
    c.setFont('Helvetica', 10)
    c.drawCentredString(width / 4, bottom_y + 20, 'Date Issued')
    c.setFillColor(text_color)
    c.setFont('Helvetica-Bold', 12)
    c.drawCentredString(width / 4, bottom_y, issued_date)

    # Certificate ID
    c.setFillColor(subtle_color)
    c.setFont('Helvetica', 10)
    c.drawCentredString(width / 2, bottom_y + 20, 'Certificate ID')
    c.setFillColor(accent_color)
    c.setFont('Helvetica-Bold', 12)
    c.drawCentredString(width / 2, bottom_y, cert_id)

    # LMS branding
    c.setFillColor(subtle_color)
    c.setFont('Helvetica', 10)
    c.drawCentredString(3 * width / 4, bottom_y + 20, 'Issued by')
    c.setFillColor(text_color)
    c.setFont('Helvetica-Bold', 12)
    c.drawCentredString(3 * width / 4, bottom_y, 'LMS Platform')

    # Bottom accent line
    c.setStrokeColor(accent_color)
    c.setLineWidth(3)
    c.line(width / 2 - 100, 65, width / 2 + 100, 65)

    c.save()
    buffer.seek(0)
    return buffer.getvalue()
