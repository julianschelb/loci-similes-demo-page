"""Extract the edit operations of every reference for the document browser.

Reads the edit-script review app's records (one pair per line: tokens, gold links and the aligner's prediction)
and writes model/ops.json, keyed by the benchmark reference id:
  t  - one operation per word of the citing passage (COPY, INFLECT, SUBST, SPLIT, MERGE, FRAME, INS)
  l  - the links, [citing word, source word, operation]; INS and DEL have none
and model/details/<id>.json, one per reference, for the detail view (loaded when it is opened): both
passages with their tokens, the edition's text and the English translation, the reference type and the
predicted links with their probabilities and citing-formula spans.
The operations are the aligner's prediction, the same ones the review app shows. Both outputs are produced
offline and tracked under model/ (the Hub datasets carry the references but not the model's output);
prepare_data.py copies them into public/data/.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

DEFAULT_RECORDS = Path("../latin-edit-script-review/public/data/gold_2026-09-24.populated.records.jsonl")


SIDE_FIELDS = ("author", "work", "citation", "text", "text_original", "text_english", "tokens")


def detail(rec: dict) -> dict:
    pred = rec["pred"]
    return {
        "id": rec["benchmark_id"],
        "pair_label": rec["pair_label"],
        "source": {k: rec["source"].get(k) for k in SIDE_FIELDS},
        "reuse": {k: rec["reuse"].get(k) for k in SIDE_FIELDS},
        "pred": {"links": pred["links"], "frame_spans": pred.get("frame_spans", [])},
    }


def prepare_ops(records: Path, out_dir: Path) -> None:
    ops = {}
    model = None
    details = out_dir / "details"
    details.mkdir(parents=True, exist_ok=True)
    with records.open() as f:
        for line in f:
            if not line.strip():
                continue
            rec = json.loads(line)
            pred = rec["pred"]
            model = model or pred.get("model")
            ops[rec["benchmark_id"]] = {
                "t": pred["tags"],
                "l": [[link["r"], link["s"], link["op"]] for link in pred["links"]],
            }
            (details / f"{rec['benchmark_id']}.json").write_text(json.dumps(detail(rec), ensure_ascii=False, separators=(",", ":")))
    payload = {"model": model, "pairs": ops}
    out = out_dir / "ops.json"
    out.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    print(f"Wrote {out}: operations for {len(ops)} references ({out.stat().st_size / 1e6:.1f} MB)")
    size = sum(f.stat().st_size for f in details.glob("*.json"))
    print(f"Wrote {details}/: {len(ops)} detail files ({size / 1e6:.1f} MB)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--records", type=Path, default=DEFAULT_RECORDS)
    parser.add_argument("--out-dir", type=Path, default=Path("model"))
    args = parser.parse_args()
    prepare_ops(args.records, args.out_dir)
