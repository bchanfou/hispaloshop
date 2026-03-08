import requests

try:
    response = requests.get("http://127.0.0.1:8000/health")
    if response.status_code == 200:
        print("Health check passed!")
        print(response.json())
    else:
        print(f"Health check failed with status code: {response.status_code}")
except requests.exceptions.ConnectionError as e:
    print(f"Failed to connect to the server: {e}")
