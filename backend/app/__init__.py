from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    from .routes import report_routes
    app.register_blueprint(report_routes)
    
    return app