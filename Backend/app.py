from flask import Flask, jsonify, url_for
from flask_cors import CORS
from .api.companies import bp as companies_bp
from .api.devices import bp as devices_bp
from dotenv import load_dotenv
load_dotenv()

def create_app():
    app = Flask(__name__)
    # Allow frontend (http://localhost:5500 or others) to call /api/*
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    app.register_blueprint(companies_bp)
    app.register_blueprint(devices_bp)

    # Helper endpoints
    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({"status": "ok"})

    @app.route('/api', methods=['GET'])
    def api_index():
        # Provide a simple listing of available endpoints
        endpoints = {
            "companies": url_for('companies.list_companies', _external=False),
            "devices_by_company": "/api/devices/company/<company_id>",
            "readings_by_device": "/api/devices/readings/device/<device_id>?limit=50",
            "health": url_for('health', _external=False)
        }
        return jsonify({"endpoints": endpoints})

    @app.route('/')
    def hello():
        return "Dynamic Device Status API"

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
