"""Build the static demo page into ./site from the downloaded datasets.

Currently renders a placeholder page with basic dataset statistics; the real
corpus and link browser will replace it.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from jinja2 import Environment, FileSystemLoader, select_autoescape

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "templates"


def dataset_summary(name: str, path: Path) -> dict:
    df = pd.read_parquet(path)
    return {
        "name": name,
        "rows": len(df),
        "columns": list(df.columns),
        "sample": df.head(3).astype(str).to_dict(orient="records"),
    }


def build(data_dir: Path, out_dir: Path) -> None:
    env = Environment(
        loader=FileSystemLoader(TEMPLATES),
        autoescape=select_autoescape(["html"]),
    )
    datasets = [
        dataset_summary(p.stem, p) for p in sorted(data_dir.glob("*.parquet"))
    ]
    out_dir.mkdir(parents=True, exist_ok=True)
    html = env.get_template("index.html").render(
        datasets=datasets,
        built_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
    )
    (out_dir / "index.html").write_text(html, encoding="utf-8")
    (out_dir / ".nojekyll").touch()
    print(f"Wrote {out_dir / 'index.html'} ({len(datasets)} datasets)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=Path("data"))
    parser.add_argument("--out-dir", type=Path, default=Path("site"))
    args = parser.parse_args()
    build(args.data_dir, args.out_dir)
