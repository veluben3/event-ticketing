import requests
import json
import os

def fetch_kyn_events():
    url = "https://kyn-api.kynhood.com/api/events/sections"
    headers = {
        "accept": "*/*",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
        "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiR1VFU1QiLCJleHAiOjE3NzkzNDY5MjcsInR5cGUiOiJjdXN0b20iLCJyb2xlIjoiR1VFU1QiLCJhY2Nlc3NMZXZlbCI6MCwic3ViIjoiNmQwOTk1YWMtZWJiZi00YjBlLWJjMmYtMjJmYTc3ZTRmMzNlIiwidXNlcl9pZCI6IjY5ZTcyMGVmZDg3ZjJjMDAxMmEzMWJlMyIsImlhdCI6MTc3Njc1NDkyOH0._C3ouV_AKbLdj12Y9nTOouacBk6evHYwB9L4dJsT9sA",
        "content-type": "application/json",
        "origin": "https://kynhood.com",
        "referer": "https://kynhood.com/",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
        "x-user-agent": "Web"
    }
    data = {"sectionIds": ["69a543d75724bd0012ccec46"]}
    
    print(f"Fetching from {url}...")
    try:
        response = requests.post(url, headers=headers, json=data, timeout=30)
        if response.status_code == 200:
            print("Successfully fetched data.")
            return response.json()
        else:
            print(f"Failed to fetch data: {response.status_code}")
            print(response.text[:500])
            return None
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None

def save_to_file(data, filename="kyn_events.json"):
    with open(filename, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Data saved to {filename}")

if __name__ == "__main__":
    data = fetch_kyn_events()
    if data:
        save_to_file(data)
