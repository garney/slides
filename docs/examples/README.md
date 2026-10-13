# Presentation JSON examples

Use these files when importing a deck in the CMS (**Import JSON**) or via the import API.

**Replace** an existing deck (keep the same presenter URL): editor → **Replace this presentation**, or `PUT /api/presentations/:id/replace`, or import with `"importMode": "replace"` and `"targetSlug"`.

**Create new:** `POST /api/presentations/import` with presentation JSON only.

## For AI agents

**Primary reference:** [`reference-presentation.json`](./reference-presentation.json)

When asked to create slides for my-slides, agents should:

1. Output a **single JSON object** (not markdown-only, not separate files per slide).
2. Set `"version": 1` always.
3. Include `"title"` and a `"slides"` array; each slide must have `"markdown"`.
4. Use optional fields where helpful:
   - `"slug"`: lowercase kebab-case (`my-talk-2026`). Omit to auto-generate on import.
   - `"templateId"`: one of `default`, `dark`, `night`, `astro`, `minimal`.
   - `"visibility"`: `public` (anyone with link) or `authenticated` (Cognito when enabled).
   - `"meta"`: free-form object (author, description, etc.).
   - `"backgroundScene"`: `none`, `minimal` (astro-account default), or `full`.
   - `"backgroundOpacity"`: `0.1`–`1` (account client uses `0.5`).
   - Per slide: `"id"`, `"layout"` (`title` | `section` | `content` | `two-column`), `"notes"` (speaker notes), `"background"` (CSS color or image URL).
5. Write slide bodies as **Markdown** strings (`##` headings, `-` lists, fenced code blocks, tables).
6. Keep one main idea per slide; use `"layout": "section"` between major parts.

Schema: [`../presentation-schema.json`](../presentation-schema.json)

## Public help deck

[`how-to-create-presentations.json`](./how-to-create-presentations.json) — **public** guide at `/p/how-to-create-presentations` (CMS header **Help** link).

Seed into the database after migrate:

```bash
npm run seed:help
```

Re-run to refresh content from the JSON file (replace by slug).

## Quick demo

[`welcome.json`](./welcome.json) — short intro deck for smoke-testing import.

[`about-my-slides.json`](./about-my-slides.json) — simple **about the product** deck (`/p/about-my-slides` after import).

[`sprint-review-2026-09-29.json`](./sprint-review-2026-09-29.json) — Mandalorian sprint review (demo order + duplicate account rules).

## Images in slides

Use Markdown in any slide:

```markdown
![Screenshot alt text](http://localhost:3091/api/assets/uploads%2Fabc.png)
```

In the CMS editor, **Upload image** on a slide stores the file in S3 (LocalStack locally) and inserts the URL. Images are served from `GET /api/assets/:key`.

## Minimal valid document

```json
{
  "version": 1,
  "title": "Minimal example",
  "templateId": "default",
  "visibility": "public",
  "slides": [
    {
      "id": "s1",
      "layout": "title",
      "markdown": "# Hello\n\nOne subtitle line"
    }
  ]
}
```
