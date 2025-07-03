from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    from .routes import report_routes
    app.register_blueprint(report_routes)
    
    @app.route('/')
    def health_check():
        return 'API is running', 200
    
    @app.after_request
    def set_security_headers(response):
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Content-Security-Policy'] = "frame-ancestors 'none'"
        return response
    
    return app