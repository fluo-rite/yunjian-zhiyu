import os
from pathlib import Path
import sys


SERVER_ROOT = Path(__file__).resolve().parents[1]
TEST_DATABASE_PATH = SERVER_ROOT / "test.sqlite3"

if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

os.environ.setdefault("DATABASE_URL", f"sqlite:///{TEST_DATABASE_PATH.as_posix()}")
os.environ.setdefault("REDIS_URL", "redis://127.0.0.1:6379/15")
