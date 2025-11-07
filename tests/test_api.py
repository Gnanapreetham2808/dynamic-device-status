import requests

BASE = "http://localhost:5000/api"


def test_companies_list():
    r = requests.get(f"{BASE}/companies/")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)


def test_devices_status_for_first_company():
    comps = requests.get(f"{BASE}/companies/").json()
    assert isinstance(comps, list)
    assert len(comps) > 0, "No companies found; ensure the server and DB are running and seeded"
    company_id = comps[0]['id']
    r = requests.get(f"{BASE}/devices/company/{company_id}")
    assert r.status_code == 200
    devices = r.json()
    assert isinstance(devices, list)
    # check expected fields
    for d in devices:
        assert 'device_id' in d
        assert 'device_name' in d
        assert 'status' in d
        assert d['status'] in ('online', 'offline')
