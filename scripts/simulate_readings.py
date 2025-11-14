import os
import time
import random
import psycopg2
from dotenv import load_dotenv


load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def main():
    
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    
    cur.execute("SELECT id FROM devices;")
    device_ids = [row[0] for row in cur.fetchall()]
    cur.close()

    if not device_ids:
        print(" No devices found. Run the seed_db.py script first.")
        conn.close()
        return

    print(f"Loaded {len(device_ids)} devices. Starting simulation... (Press Ctrl+C to stop)")

    try:
        while True:
            did = random.choice(device_ids)
            with conn.cursor() as c:
                c.execute(
                    "INSERT INTO device_readings (device_id, data) VALUES (%s, %s);",
                    (did, '{"temp": 22}')
                )
            conn.commit()
            print(f"📡 Inserted reading for device {did}")
            time.sleep(5)  # Wait 5 seconds before inserting next reading

    except KeyboardInterrupt:
        print("\n Simulation stopped by user.")
    finally:
        conn.close()
        print(" Database connection closed.")

if __name__ == "__main__":
    main()
