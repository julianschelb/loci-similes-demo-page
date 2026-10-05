# Loci Similes — Dataset Demo Page

Live page: https://julianschelb.github.io/loci-similes-demo-page/

Read-only web demo of the corpus and the intertextual references of the
[Loci Similes](https://huggingface.co/collections/julian-schelb/datasets-for-latin-intertextuality-search)
benchmark: a paper header, an interactive reference graph, and a browser for
the documents and their references. Built with React, Vite and Tailwind CSS;
data is pulled from the Hugging Face Hub by a GitHub Actions workflow and the
app is published with GitHub Pages.

## Pipeline

1. `scripts/download_data.py` downloads the public datasets of the collection
   (`corpus`, `queries`, `labels`) into `data/`.
2. `scripts/prepare_data.py` converts them into JSON under `public/data/`
   for the app, and copies the files tracked under `model/` alongside.
   `model/ops.json` (the edit operation of every word) and `model/details/`
   (one detail view per reference) are produced offline by
   `scripts/prepare_ops.py` from the edit-script review app's records, since
   the Hub datasets carry the references but not the model's output.
3. `npm run build` bundles the app into `dist/`.
4. `.github/workflows/build-and-deploy.yml` runs all steps on every push to
   `main`, weekly, or manually, and deploys `dist/` to GitHub Pages
   (Settings → Pages → Source: GitHub Actions).

## Local development

```bash
pip install -r requirements.txt
python scripts/download_data.py
python scripts/prepare_data.py
npm install
npm run dev        # http://localhost:5173/loci-similes-demo-page/
```

## Layout

- `src/paper.js` — paper metadata shown in the header (title, authors, abstract, links, BibTeX).
- `src/components/PaperHeader.jsx` — ACL-Anthology-style header with abstract and action buttons.
- `src/components/ReferenceGraph.jsx` — author graph; hover unfolds an author into its works, a click pins it and filters.
- `src/components/DocumentBrowser.jsx` — one card per citing passage beside its sources, with the edit operations; "Show details" opens the detail dialog.
- `src/components/detail/` — the detail view, adapted from the edit-script review app (mapping, texts, links).
