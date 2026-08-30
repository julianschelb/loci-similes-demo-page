# Loci Similes — Dataset Demo Page

Static demo page showing the corpus and the intertextual links of the
[Loci Similes](https://huggingface.co/collections/julian-schelb/datasets-for-latin-intertextuality-search)
benchmark. The site is rebuilt from the Hugging Face datasets by a GitHub
Actions workflow and published with GitHub Pages.

## Pipeline

1. `scripts/download_data.py` downloads the public datasets of the collection
   (`corpus`, `queries`, `labels`) into `data/`.
2. `scripts/build_site.py` renders the static site into `site/` from the
   Jinja templates in `templates/`.
3. `.github/workflows/build-and-deploy.yml` runs both steps on every push to
   `main`, weekly, or manually, and deploys `site/` to GitHub Pages.

## Local build

```bash
pip install -r requirements.txt
python scripts/download_data.py
python scripts/build_site.py
python -m http.server -d site 8000   # open http://localhost:8000
```

## Setup on GitHub

Repository → Settings → Pages → *Build and deployment* → Source: **GitHub Actions**.
No secrets are required for the public datasets; set `HF_TOKEN` only if private
datasets are added later.
