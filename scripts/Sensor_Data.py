import time
import random
import os
import psycopg2
from dotenv import load_dotenv

# Load .env
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise SystemExit("❌ DATABASE_URL missing in .env")

# -----------------------------------
# IoT Sensor Data Generator (8 fields)
# -----------------------------------

def generate_iot_data(device_name):
    """Generate all 8 sensor readings for any device."""

    # Generate all sensor readings for every device
    reading = {
        "temperature": round(random.uniform(20, 90), 2),
        "humidity": round(random.uniform(30, 85), 2),
        "vibration": round(random.uniform(0, 10), 2),
        "voltage": round(random.uniform(11, 15), 2),
        "current": round(random.uniform(2, 50), 2),
        "rpm": round(random.uniform(500, 6000), 2),
        "power_watts": round(random.uniform(100, 5000), 2),
        "noise_db": round(random.uniform(40, 120), 2),
    }

    return reading


# -----------------------------------
# Main Simulation Loop
# -----------------------------------

def main():
    print("Connecting to PostgreSQL…")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Load devices (IDs + names)
    cur.execute("SELECT id, name FROM devices;")
    devices = cur.fetchall()

    if not devices:
        print("❌ No devices found. Insert devices first.")
        return

    print(f"Loaded {len(devices)} devices:")
    for d in devices:
        print(" -", d)

    print("\n📡 Starting IoT Sensor Simulator… (Ctrl+C to stop)\n")

    try:
        while True:
            for device_id, device_name in devices:
                data = generate_iot_data(device_name)

                cur = conn.cursor()
                cur.execute("""
                    INSERT INTO device_readings 
                    (device_id, temperature, humidity, vibration, voltage, current, rpm, power_watts, noise_db)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, (
                    device_id,
                    data["temperature"],
                    data["humidity"],
                    data["vibration"],
                    data["voltage"],
                    data["current"],
                    data["rpm"],
                    data["power_watts"],
                    data["noise_db"]
                ))
                conn.commit()
                cur.close()

                print(f"Inserted for {device_name}: {data}")

            time.sleep(3)

    except KeyboardInterrupt:
        print("\n🛑 Simulator stopped.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
