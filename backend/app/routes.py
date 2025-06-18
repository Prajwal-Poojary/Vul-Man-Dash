from flask import Blueprint, request, send_file
from flask_cors import CORS 
import io
import tempfile
import os
import zipfile
from PyPDF2 import PdfWriter, PdfReader
import logging
import pikepdf

report_routes = Blueprint('report', __name__, url_prefix='/api/report')
CORS(report_routes)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@report_routes.route('/protect-docx', methods=['POST'])
def protect_docx():
    try:
        # Validate input
        if 'file' not in request.files:
            return {"error": "No file uploaded"}, 400
            
        file = request.files['file']
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        
        if len(password) < 6:
            return {"error": "Password must be at least 6 characters"}, 400
        if password != confirm_password:
            return {"error": "Passwords do not match"}, 400

        # Create temp workspace
        temp_dir = tempfile.mkdtemp()
        original_docx = os.path.join(temp_dir, 'document.docx')
        protected_zip = os.path.join(temp_dir, 'protected.zip')
        
        # Save uploaded file
        file.save(original_docx)
        
        # Create password-protected ZIP
        try:
            with zipfile.ZipFile(protected_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
                zipf.setpassword(password.encode('utf-8'))
                zipf.write(original_docx, arcname='document.docx')
        except Exception as e:
            return {"error": f"Failed to create protected archive: {str(e)}"}, 500

        # Read the protected file
        with open(protected_zip, 'rb') as f:
            zip_data = f.read()
        
        # Clean up
        try:
            os.remove(original_docx)
            os.remove(protected_zip)
            os.rmdir(temp_dir)
        except:
            pass

        # Return the protected file with original .docx extension
        return send_file(
            io.BytesIO(zip_data),
            as_attachment=True,
            download_name='protected_report.docx',  # Maintain .docx extension
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500

@report_routes.route('/protect-pdf', methods=['POST'])
def protect_pdf():
    try:
        if 'file' not in request.files:
            logger.error("No file uploaded")
            return {"error": "No file uploaded"}, 400

        file = request.files['file']
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')

        if len(password) < 6:
            logger.error("Password too short")
            return {"error": "Password must be at least 6 characters"}, 400
        if password != confirm_password:
            logger.error("Passwords do not match")
            return {"error": "Passwords do not match"}, 400

        # Read PDF directly from memory
        input_pdf = io.BytesIO(file.read())
        output_pdf = io.BytesIO()

        try:
            with pikepdf.open(input_pdf) as pdf:
                if pdf.is_encrypted:
                    logger.error("PDF is already encrypted")
                    return {"error": "PDF is already encrypted"}, 400
                pdf.save(output_pdf, encryption=pikepdf.Encryption(owner=password, user=password, R=4))
            output_pdf.seek(0)
        except Exception as e:
            logger.error(f"PDF processing error: {str(e)}")
            return {"error": f"PDF processing error: {str(e)}"}, 500

        return send_file(
            output_pdf,
            as_attachment=True,
            download_name='protected_report.pdf',
            mimetype='application/pdf'
        )

    except Exception as e:
        logger.error(f"PDF protection failed: {str(e)}")
        return {"error": f"PDF protection failed: {str(e)}"}, 500