CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE devices (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  --  device names are unique per company
  UNIQUE (company_id, name)
);

CREATE TABLE device_readings (
  id BIGSERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  temperature NUMERIC(5,2),
  voltage NUMERIC(5,2),
  speed_rpm NUMERIC(7,2),
  fuel_level NUMERIC(5,2),
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),
  data JSONB
);

-- indexes
CREATE INDEX idx_device_readings_device_inserted ON device_readings(device_id, inserted_at DESC);
