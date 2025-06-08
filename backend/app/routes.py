from flask import Blueprint, request, send_file
from flask_cors import CORS 
import io
import tempfile
import os
import zipfile
from PyPDF2 import PdfWriter, PdfReader

report_routes = Blueprint('report', __name__, url_prefix='/api/report')
CORS(report_routes)

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
            return {"error": "No file uploaded"}, 400
            
        file = request.files['file']
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        
        if len(password) < 6:
            return {"error": "Password must be at least 6 characters"}, 400
        if password != confirm_password:
            return {"error": "Passwords do not match"}, 400

        # Process PDF
        pdf_writer = PdfWriter()
        pdf_reader = PdfReader(file.stream)
        
        for page in pdf_reader.pages:
            pdf_writer.add_page(page)
            
        pdf_writer.encrypt(user_pwd=password, owner_pwd=None, use_128bit=True)
        
        buffer = io.BytesIO()
        pdf_writer.write(buffer)
        buffer.seek(0)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name='protected_report.pdf',
            mimetype='application/pdf'
        )
    except Exception as e:
        return {"error": f"PDF protection failed: {str(e)}"}, 500