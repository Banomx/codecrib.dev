import json
import requests
import os

# Pfad zur JSON-Datei
JSON_PATH = os.path.join('assets', 'data', 'links.json')

def check_url(url, name):
    try:
        # Wir senden einen HEAD-Request (schneller als GET, da kein Body geladen wird)
        # Manche Server blockieren HEAD, dann versuchen wir einen GET mit Stream
        response = requests.head(url, allow_redirects=True, timeout=10)
        
        if response.status_code >= 400:
            response = requests.get(url, stream=True, timeout=10)
            
        if response.status_code < 400:
            print(f"✅ [OK] {name}")
            return True
        else:
            print(f"❌ [FAIL] {name} (Status: {response.status_code}) - URL: {url}")
            return False
    except Exception as e:
        print(f"⚠️ [ERROR] {name} (Fehler: {str(e)})")
        return False

def run_health_check():
    if not os.path.exists(JSON_PATH):
        print(f"Datei {JSON_PATH} nicht gefunden!")
        return

    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print("--- Starte Link-Check für codebrib.dev ---\n")
    results = []

    # 1. Dashboard Links prüfen
    print("Prüfe Dashboard-Portale...")
    for link in data.get('dashboard', []):
        results.append(check_url(link['url'], link['title']))

    print("\nPrüfe Software-Downloads...")
    # 2. Software Links prüfen (verschachtelt)
    for category in data.get('software', []):
        for item in category.get('items', []):
            results.append(check_url(item['url'], item['name']))

    # Zusammenfassung
    total = len(results)
    success = sum(results)
    print(f"\n--- Ergebnis: {success}/{total} Links sind erreichbar ---")

if __name__ == "__main__":
    run_health_check()