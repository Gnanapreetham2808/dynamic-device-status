from flask import Blueprint, jsonify, request
from Backend.db import get_conn

bp = Blueprint('devices', __name__, url_prefix='/api/devices')

@bp.route('/company/<int:company_id>', methods=['GET'])
def devices_by_company(company_id):
    conn = get_conn()
    cur = conn.cursor()
    query = """
    SELECT d.id AS device_id, d.name AS device_name,
           lr.last_read_at,
           CASE
             WHEN lr.last_read_at IS NULL THEN 'offline'
             WHEN lr.last_read_at >= now() - interval '90 seconds' THEN 'online'
             ELSE 'offline'
           END AS status
    FROM devices d
    LEFT JOIN (
      SELECT device_id, max(inserted_at) AS last_read_at
      FROM device_readings
      GROUP BY device_id
    ) lr ON lr.device_id = d.id
    WHERE d.company_id = %s
    ORDER BY d.name;
    """
    cur.execute(query, (company_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    # rows are RealDict rows
    return jsonify([dict(r) for r in rows])

@bp.route('/readings/device/<int:device_id>', methods=['GET'])
def readings_by_device(device_id):
    limit = request.args.get('limit', default=50, type=int)
    conn = get_conn()
    cur = conn.cursor()
    query = """
    SELECT 
        id,
        device_id,
        temperature,
        humidity,
        vibration,
        voltage,
        current,
        rpm,
        power_watts,
        noise_db,
        latitude,
        longitude,
        inserted_at
    FROM device_readings
    WHERE device_id = %s
    ORDER BY inserted_at DESC
    LIMIT %s
    """
    cur.execute(query, (device_id, limit))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    # Return in chronological order (oldest to newest)
    return jsonify([dict(r) for r in reversed(rows)])
