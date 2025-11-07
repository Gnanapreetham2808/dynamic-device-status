import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def get_or_create_company(cur, name):
    # Try to insert; if already exists, fetch the id
    cur.execute("INSERT INTO companies (name) VALUES (%s) ON CONFLICT (name) DO NOTHING RETURNING id;", (name,))
    res = cur.fetchone()
    if res:
        return res[0]
    cur.execute("SELECT id FROM companies WHERE name=%s;", (name,))
    return cur.fetchone()[0]

def ensure_device(cur, company_id, name):
    # Insert device only if it doesn't already exist for the company
    cur.execute("SELECT id FROM devices WHERE company_id=%s AND name=%s;", (company_id, name))
    if cur.fetchone() is None:
        cur.execute("INSERT INTO devices (company_id,name) VALUES (%s,%s);", (company_id, name))


def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # create 2 companies and 3-5 devices each (idempotent)
    acme_id = get_or_create_company(cur, 'Acme Co')
    beta_id = get_or_create_company(cur, 'Beta Ltd')

    devices_acme = ['Acme-R1', 'Acme-R2', 'Acme-Switch']
    devices_beta = ['Beta-R1', 'Beta-R2', 'Beta-Switch', 'Beta-AP']

    for name in devices_acme:
        ensure_device(cur, acme_id, name)
    for name in devices_beta:
        ensure_device(cur, beta_id, name)

    conn.commit()
    cur.close()
    conn.close()
    print("Seeded companies and devices (idempotent)")


if __name__ == '__main__':
    main()
