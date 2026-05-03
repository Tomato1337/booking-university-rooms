#!/usr/bin/env python3
import os
import re
import sys
import time
from http.cookiejar import MozillaCookieJar
from urllib.parse import quote

import requests

MTUCI_COOKIES_FILE = os.environ.get("MTUCI_COOKIES_FILE", "mtuci_cookies.txt")
API_BASE = os.environ.get("API_BASE", "http://localhost:3000/api")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@uni.edu")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
BUILDING = os.environ.get("BUILDING", "А-")
MONTH = int(os.environ.get("MONTH", "4"))
DELAY = float(os.environ.get("DELAY", "0.1"))

PURPOSE_MAP = {
    "Лабораторные работы": "research_workshop",
    "Лекция": "academic_lecture",
    "Лекции": "academic_lecture",
    "Консультация": "collaborative_study",
    "Экзамен": "technical_assessment",
    "Зачёт": "technical_assessment",
    "Зачет": "technical_assessment",
    "Практика": "research_workshop",
    "Практические занятия": "research_workshop",
    "Курсовая работа": "collaborative_study",
}


def parse_floor(name: str) -> int:
    digits = re.findall(r"\d+", name)
    if digits and digits[0]:
        return int(digits[0][0])
    return 1


def parse_building(name: str) -> str:
    parts = name.split("-", 1)
    b = parts[0].strip()
    return b or "Авиамоторная"


def date_ddmm_to_iso(date_str: str) -> str:
    parts = date_str.split(".")
    return f"{parts[2]}-{parts[1]}-{parts[0]}"


class MtuciClient:
    def __init__(self, cookies_file: str):
        self.session = requests.Session()
        jar = MozillaCookieJar(cookies_file)
        jar.load(ignore_discard=True, ignore_expires=True)
        self.session.cookies = jar
        self.session.headers.update(
            {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0",
                "Accept": "application/json, text/plain, */*",
                "Referer": "https://lk.mtuci.ru/timetable/",
                "X-Requested-With": "XMLHttpRequest",
            },
        )

    def search_rooms(self, building: str) -> list[dict]:
        url = f"https://lk.mtuci.ru/api/timetable/search/get?value={quote(building)}"
        resp = self.session.get(url)
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") != "success":
            raise RuntimeError(f"MTUCI search error: {data}")
        return data.get("data", [])

    def get_schedule(self, room_value: str, month: int) -> dict:
        url = f"https://lk.mtuci.ru/api/timetable/get?value={quote(room_value)}&month={month}&type=audience"
        resp = self.session.get(url)
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") != "success":
            raise RuntimeError(f"MTUCI schedule error: {data}")
        return data.get("data", {})


class ApiClient:
    def __init__(self, base_url: str, email: str, password: str):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.token = None
        self._login(email, password)

    def _login(self, email: str, password: str):
        resp = self.session.post(
            f"{self.base_url}/auth/login",
            json={
                "email": email,
                "password": password,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        self.token = data["data"]["accessToken"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})

    def find_room(self, name: str) -> str | None:
        resp = self.session.get(
            f"{self.base_url}/admin/rooms",
            params={"search": name, "limit": "10"},
        )
        if not resp.ok:
            return None
        data = resp.json()
        rooms = data.get("data") or []
        for r in rooms:
            if r.get("name") == name:
                return r.get("id")
        return None

    def ensure_room(self, name: str) -> str:
        existing = self.find_room(name)
        if existing:
            return existing

        floor = parse_floor(name)
        building = parse_building(name)
        resp = self.session.post(
            f"{self.base_url}/rooms",
            json={
                "name": name,
                "roomType": "auditorium",
                "capacity": 30,
                "building": "Авиамоторная" if building == "А" else building,
                "floor": floor,
            },
        )
        if not resp.ok:
            print(
                f"  Create room failed: {resp.status_code} {resp.text}",
                file=sys.stderr,
            )
            resp.raise_for_status()
        return resp.json()["data"]["id"]
        return ""

    def bulk_import_bookings(self, bookings: list[dict]) -> int:
        if not bookings:
            return 0
        resp = self.session.post(
            f"{self.base_url}/admin/bookings/import",
            json={"bookings": bookings},
        )
        if resp.status_code == 429:
            print("    Rate limited, waiting 10s...")
            time.sleep(10)
            return self.bulk_import_bookings(bookings)
        resp.raise_for_status()
        return resp.json()["data"]["created"]

    def bulk_approve(self) -> int:
        resp = self.session.post(f"{self.base_url}/admin/bookings/approve-all")
        resp.raise_for_status()
        return resp.json()["data"]["approved"]


def main():
    print("=== MTUCI Sync ===")
    print(f"Building: {BUILDING}, Month: {MONTH}")
    print(f"Cookie file: {MTUCI_COOKIES_FILE}")
    print(f"API: {API_BASE}")

    if not os.path.exists(MTUCI_COOKIES_FILE):
        print(f"ERROR: Cookie file not found: {MTUCI_COOKIES_FILE}")
        sys.exit(1)

    mtuci = MtuciClient(MTUCI_COOKIES_FILE)
    api = ApiClient(API_BASE, ADMIN_EMAIL, ADMIN_PASSWORD)

    print("\n--- Fetching rooms from MTUCI ---")
    rooms = mtuci.search_rooms(BUILDING)
    print(f"Found {len(rooms)} rooms")

    room_map = {}
    for room in rooms:
        name = room["UF_NAME"]
        print(f"  Room: {name}")

        room_id = api.ensure_room(name)
        print(f"    -> ID: {room_id}")
        room_map[name] = room_id

    print("\n--- Fetching schedules and importing ---")
    all_bookings = []

    for room in rooms:
        name = room["UF_NAME"]
        room_id = room_map[name]

        schedule = mtuci.get_schedule(room["value"], MONTH)
        days = schedule.get("days") if isinstance(schedule, dict) else None

        if not days:
            print(f"  {name}: 0 entries from value, trying UF_NAME...")
            schedule = mtuci.get_schedule(name, MONTH)
            days = schedule.get("days") if isinstance(schedule, dict) else None

        room_bookings = []

        if not days:
            print(f"  {name}: 0 entries (empty response)")
            time.sleep(0.3)
            continue

        for date_str, entries in days.items():
            booking_date = date_ddmm_to_iso(date_str)
            for entry in entries:
                audience_list = entry.get("UF_AUDIENCE", [])
                if name not in audience_list:
                    continue

                title = entry.get("UF_DISCIPLINE", "").strip()
                start = entry.get("UF_TIME_START", "").strip()
                end = entry.get("UF_TIME_END", "").strip()
                lesson_type = entry.get("UF_TYPE", "").strip()

                if not title or not start or not end:
                    continue

                purpose = PURPOSE_MAP.get(lesson_type, "academic_lecture")

                room_bookings.append(
                    {
                        "roomId": room_id,
                        "title": title,
                        "purpose": purpose,
                        "bookingDate": booking_date,
                        "startTime": start,
                        "endTime": end,
                    }
                )

        if room_bookings:
            all_bookings.extend(room_bookings)
        print(f"  {name}: {len(room_bookings)} entries")
        time.sleep(0.2)

    print(f"\n--- Total: {len(all_bookings)} entries ---")

    if all_bookings:
        BATCH_SIZE = 100
        total_created = 0
        for i in range(0, len(all_bookings), BATCH_SIZE):
            batch = all_bookings[i : i + BATCH_SIZE]
            print(
                f"  Importing batch {i // BATCH_SIZE + 1}/{(len(all_bookings) - 1) // BATCH_SIZE + 1} ({len(batch)} entries)..."
            )
            created = api.bulk_import_bookings(batch)
            total_created += created
            print(f"    Created: {created}")
            time.sleep(DELAY)

        print(f"\n  Total created: {total_created}")

        print("\n--- Approving all pending bookings ---")
        approved = api.bulk_approve()
        print(f"  Approved: {approved}")
    else:
        print("  No bookings to import")

    print("\n=== Done ===")


if __name__ == "__main__":
    main()
