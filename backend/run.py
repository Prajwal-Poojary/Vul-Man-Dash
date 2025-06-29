from app import create_app
import os

app = create_app()

def is_debug():
    return os.environ.get('FLASK_DEBUG', '0') == '1'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=is_debug())