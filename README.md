# P³-VLM project page

Static site with no build step: `index.html` + `static/` (css, js, img, fonts, video).

Preview locally:

```bash
py -3 -m http.server 8123
```

Deploy: push to GitHub and enable Pages from the repo root (`.nojekyll` is included).

`static/img/*` was generated from `assets/` (rooms cropped to their content and flattened onto `#F3F0E8`
as JPEG, photos downsized to 240 px). Quiz boxes, query points and the caption-game scene live in `static/js/main.js`.
After editing CSS or JS, bump the `?v=` number on their links in `index.html` so browsers fetch the new files.

## Placeholders still to fill (search for `TODO` in `index.html`)
- Paper and Code links (buttons are shown as disabled until then)
- Final video hosting (currently `static/video/p3vlm_video_v3.mp4`, ~3 MB)
- BibTeX entry (authors filled in; check the final key and venue fields)
- Original logo files (the current ones are cropped from a video frame)
