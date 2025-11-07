from flask import Blueprint, jsonify
from Backend.db import get_conn

bp = Blueprint('companies', __name__, url_prefix='/api/companies')

@bp.route('/', methods=['GET'])
def list_companies():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM companies ORDER BY name;")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify([dict(r) for r in rows])
