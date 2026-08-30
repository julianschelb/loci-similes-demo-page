"""Convert the downloaded parquet datasets into JSON files for the web app.

Output goes to public/data/ and is bundled by Vite. For now only a stats
summary is emitted; per-author shards for the corpus/reference browser will be
added with the real views.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd


def prepare(data_dir: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    stats = {"built_at": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
    for path in sorted(data_dir.glob("*.parquet")):
        df = pd.read_parquet(path)
        stats[path.stem] = {"rows": int(len(df)), "columns": list(df.columns)}
    (out_dir / "stats.json").write_text(json.dumps(stats, indent=2), encoding="utf-8")
    print(f"Wrote {out_dir / 'stats.json'}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=Path("data"))
    parser.add_argument("--out-dir", type=Path, default=Path("public/data"))
    args = parser.parse_args()
    prepare(args.data_dir, args.out_dir)
