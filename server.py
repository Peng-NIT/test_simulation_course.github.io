"""Serve the website with a persistent shared visit counter (Python standard library)."""
import argparse
import json
import secrets
import sqlite3
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
DB = ROOT / ".data" / "visits.sqlite3"


def count_visit(increase=False):
    with sqlite3.connect(DB, timeout=20) as connection:
        connection.execute("BEGIN IMMEDIATE")
        connection.execute("CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY CHECK(id=1), total INTEGER NOT NULL)")
        connection.execute("INSERT OR IGNORE INTO visits VALUES (1, 1000)")
        if increase:
            connection.execute("UPDATE visits SET total=MIN(total + ?, 9007199254740991) WHERE id=1", (secrets.randbelow(9) + 1,))
        return connection.execute("SELECT total FROM visits WHERE id=1").fetchone()[0]


class Handler(SimpleHTTPRequestHandler):
    def api(self, increase=False):
        try:
            body = json.dumps({"total": count_visit(increase)}).encode()
        except sqlite3.Error:
            self.send_error(503, "Counter unavailable")
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if urlsplit(self.path).path == "/api/visits":
            self.api(True)
        else:
            self.send_error(404)

    def do_GET(self):
        if urlsplit(self.path).path == "/api/visits":
            self.api()
        else:
            super().do_GET()

    def send_head(self):
        path = Path(self.translate_path(self.path)).resolve()
        # Never expose the counter database, repository, or server source.
        if not path.is_relative_to(ROOT) or any(part.startswith(".") for part in path.relative_to(ROOT).parts) or path.suffix == ".py":
            self.send_error(404)
            return None
        return super().send_head()

    def list_directory(self, path):
        self.send_error(404)
        return None


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    DB.parent.mkdir(exist_ok=True)
    count_visit()
    server = ThreadingHTTPServer((args.host, args.port), partial(Handler, directory=str(ROOT)))
    print(f"Website: http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
