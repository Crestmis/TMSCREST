# Updating the CREST Logo

The brand mark is the orange rounded square that currently shows the letter **C**.
It appears in two places: the sidebar and the login screen. There is also the
browser‑tab icon (favicon).

You can either **change the letter/colour** (30 seconds) or **use your own image**
(2 minutes).

---

## Option A — change the letter or the colour (no image)

### Change the letter
1. Open [`src/components/Sidebar.jsx`](src/components/Sidebar.jsx), find:
   ```jsx
   <div className="brand-mark">C</div>
   ```
   Replace `C` with your initial(s), e.g. `<div className="brand-mark">TMS</div>`.
2. Open [`src/pages/Login.jsx`](src/pages/Login.jsx), find:
   ```jsx
   <div className="brand-mark large">C</div>
   ```
   Make the same change.

### Change the colour
Open [`src/index.css`](src/index.css) and edit the CREST palette variables near
the bottom (search for `--crest-orange`):
```css
:root{--crest-orange:#f28a1a;--crest-orange-dark:#d96f08;--crest-orange-soft:#fff3e4; ...}
```
`--crest-orange` is the badge fill and the primary‑button colour;
`--crest-orange-dark` is the hover/active shade.

---

## Option B — use your own logo image (recommended)

### 1. Add the image file
Create a folder named **`public`** in the project root (same level as
`package.json`) if it does not exist, and copy your logo into it:

```
public/logo.png
```

- Use a **square** PNG or SVG (e.g. 256×256). Transparent background looks best.
- Anything in `public/` is served at the site root, so the file is reachable at
  `/logo.png` — no import needed.

### 2. Point the sidebar at it
[`src/components/Sidebar.jsx`](src/components/Sidebar.jsx):
```jsx
<div className="brand-mark"><img src="/logo.png" alt="CREST"/></div>
```

### 3. Point the login screen at it
[`src/pages/Login.jsx`](src/pages/Login.jsx):
```jsx
<div className="brand-mark large"><img src="/logo.png" alt="CREST"/></div>
```

The CSS already handles the rest: an `<img>` inside `.brand-mark` fills the badge
and the orange background is removed automatically.

### 4. (Optional) change the wordmark text
In the same two files, next to the badge:
```jsx
<div><b>CREST</b><small>Task Management</small></div>
```
Edit `CREST` and `Task Management` to your product name / tagline.

---

## 3. Browser‑tab icon (favicon)

1. Put a small square icon in `public/`, e.g. `public/favicon.png` (or `.svg` / `.ico`).
2. Open [`index.html`](index.html) and add a `<link>` inside `<head>`:
   ```html
   <head>
     <meta charset="UTF-8"/>
     <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
     <link rel="icon" type="image/png" href="/favicon.png"/>
     <title>CREST</title>
   </head>
   ```
3. Change `<title>CREST</title>` to your product name if you want a different tab title.

---

## 4. See the change

- **Dev:** `npm run dev` — the sidebar/login update immediately on save.
- **Production:** `npm run build` then redeploy the `dist/` output (or push to
  Git and let Vercel rebuild). Hard‑refresh (Ctrl+F5) to clear a cached favicon.
