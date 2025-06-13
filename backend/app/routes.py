from flask import Blueprint, request, send_file
from flask_cors import CORS 
import io
import tempfile
import os
import zipfile
from PyPDF2 import PdfWriter, PdfReader
import logging

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

        # Create a temporary file to store the uploaded PDF
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        file.save(temp_file.name)
        temp_file.close()

        try:
            # Process PDF
            pdf_writer = PdfWriter()
            pdf_reader = PdfReader(temp_file.name)
            
            # Check if PDF is already encrypted
            if pdf_reader.is_encrypted:
                logger.error("PDF is already encrypted")
                return {"error": "PDF is already encrypted"}, 400
            
            # Add all pages
            for page in pdf_reader.pages:
                pdf_writer.add_page(page)
            
            # Set encryption with 128-bit key
            pdf_writer.encrypt(user_pwd=password, owner_pwd=password, use_128bit=True)
            
            # Write to buffer
            buffer = io.BytesIO()
            pdf_writer.write(buffer)
            buffer.seek(0)
            
            # Clean up temporary file
            os.unlink(temp_file.name)
            
            return send_file(
                buffer,
                as_attachment=True,
                download_name='protected_report.pdf',
                mimetype='application/pdf'
            )
        except Exception as e:
            logger.error(f"PDF processing error: {str(e)}")
            # Clean up temporary file in case of error
            if os.path.exists(temp_file.name):
                os.unlink(temp_file.name)
            raise
            
    except Exception as e:
        logger.error(f"PDF protection failed: {str(e)}")
        return {"error": f"PDF protection failed: {str(e)}"}, 500