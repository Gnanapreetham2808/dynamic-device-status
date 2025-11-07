import time, random, os
import psycopg2
from dotenv import load_dotenv
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()
cur.execute("SELECT id FROM devices;")
device_ids = [r[0] for r in cur.fetchall()]
cur.close()

try:
    while True:
        did = random.choice(device_ids)
        cur = conn.cursor()
        cur.execute("INSERT INTO device_readings (device_id, data) VALUES (%s, %s);", (did, '{"temp": 22}'))
        conn.commit()
        print(f"Inserted reading for device {did}")
        cur.close()
        time.sleep(5)  # change frequency as needed
except KeyboardInterrupt:
    conn.close()
