import os
import psycopg2
import argparse
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Ensure UNIQUE(company_id, name) constraint
def ensure_devices_unique_constraint(cur):
    cur.execute(
        """
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE t.relname = 'devices'
            AND n.nspname = 'public'
            AND c.contype = 'u'
            AND c.conname = 'devices_company_name_key';
        """
    )
    exists = cur.fetchone()
    if not exists:
        cur.execute(
            "ALTER TABLE devices ADD CONSTRAINT devices_company_name_key UNIQUE (company_id, name);"
        )
        print("🔧 Added UNIQUE constraint devices(company_id, name)")


def get_or_create_company(cur, name):
    cur.execute(
        "INSERT INTO companies (name) VALUES (%s) ON CONFLICT (name) DO NOTHING RETURNING id;",
        (name,),
    )
    res = cur.fetchone()
    if res:
        return res[0]

    cur.execute("SELECT id FROM companies WHERE name=%s;", (name,))
    return cur.fetchone()[0]


def ensure_device(cur, company_id, name):
    cur.execute(
        """
        INSERT INTO devices (company_id, name)
        VALUES (%s, %s)
        ON CONFLICT (company_id, name) DO NOTHING
        RETURNING id;
        """,
        (company_id, name),
    )
    res = cur.fetchone()
    if res:
        return res[0]

    cur.execute(
        "SELECT id FROM devices WHERE company_id=%s AND name=%s;",
        (company_id, name),
    )
    row = cur.fetchone()
    return row[0] if row else None


def main():
    parser = argparse.ArgumentParser(description="Seed the automotive device database")
    parser.add_argument("--reset", action="store_true", help="Clear all tables first")
    args = parser.parse_args()

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Reset tables if requested
    if args.reset:
        cur.execute("TRUNCATE device_readings, devices, companies RESTART IDENTITY CASCADE;")
        conn.commit()
        print("🔄 Database reset: companies, devices, device_readings")

    # Ensure required constraint
    ensure_devices_unique_constraint(cur)

    # --- Motor Companies ---
    company_names = [
        "Maruti Suzuki",
        "Honda",
        "Hyundai",
        "Tata Motors",
        "Mahindra",
        "Toyota",
        "BMW",
        "Hero MotoCorp",
    ]

    company_ids = {}
    for name in company_names:
        company_ids[name] = get_or_create_company(cur, name)

    # --- Automotive sensor devices ---
    sensor_list = [
        "Engine-Temp",
        "Battery-Voltage",
        "Speed-RPM",
        "Fuel-Level",
        "GPS-Location",
    ]

    for company, cid in company_ids.items():
        for sensor in sensor_list:
            ensure_device(cur, cid, sensor)

    conn.commit()
    cur.close()
    conn.close()
    print("✅ Seeded automotive companies and sensors successfully (idempotent)")


if __name__ == "__main__":
    main()
