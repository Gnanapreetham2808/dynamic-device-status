import os
import psycopg2
import argparse
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")


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
    parser = argparse.ArgumentParser(description="Seed the device_status database")
    parser.add_argument("--reset", action="store_true", help="Truncate tables before seeding")
    args = parser.parse_args()

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    if args.reset:
        cur.execute("TRUNCATE device_readings, devices, companies RESTART IDENTITY CASCADE;")
        conn.commit()
        print("🔄 Database truncated (device_readings, devices, companies)")

    # --- Companies ---
    company_names = [
        "Acme Co",
        "Beta Ltd",
        "Gamma Networks",
        "Delta Systems",
        "Epsilon Tech"
    ]

    company_ids = {}
    for name in company_names:
        company_ids[name] = get_or_create_company(cur, name)

    # --- Devices ---
    company_devices = {
        "Acme Co": ["Acme-R1", "Acme-R2", "Acme-Switch", "Acme-AP"],
        "Beta Ltd": ["Beta-R1", "Beta-R2", "Beta-Switch", "Beta-AP", "Beta-Core"],
        "Gamma Networks": ["Gamma-R1", "Gamma-R2", "Gamma-Edge"],
        "Delta Systems": ["Delta-R1", "Delta-R2", "Delta-Switch", "Delta-Edge"],
        "Epsilon Tech": ["Epsilon-R1", "Epsilon-R2", "Epsilon-Core", "Epsilon-AP"],
    }

    for company, devices in company_devices.items():
        cid = company_ids[company]
        for dev in devices:
            ensure_device(cur, cid, dev)

    conn.commit()
    cur.close()
    conn.close()
    print("✅ Seeded 5 companies and their devices (idempotent)")


if __name__ == "__main__":
    main()
