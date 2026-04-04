"""后端根目录、SQLite 文件、schema 与种子数据的 pathlib 路径。"""
from __future__ import annotations

from pathlib import Path

# backend/ 根（即包含 app/、data/、sql/ 的目录）
BACKEND_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_ROOT / "data"
DB_PATH = DATA_DIR / "app.db"
SQL_DIR = BACKEND_ROOT / "sql"
SEED_DIR = BACKEND_ROOT / "data" / "seed"
