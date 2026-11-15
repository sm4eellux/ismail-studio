# ISMAIL.STUDIO — Portfolio Website

A multi-page portfolio built with **plain HTML, CSS and JavaScript**, plus GSAP, Three.js and EmailJS (all loaded from CDNs). No build step, no backend. Works on GitHub Pages.

## Folder structure
```text
ismail-studio/
├── index.html · work.html · project-details.html
├── services.html · about.html · process.html · contact.html
├── css/   style.css (design tokens + components) · responsive.css · animations.css
├── js/    main.js (contact details, nav) · projects.js (ALL project data)
│          animations.js (GSAP) · three-background.js · contact.js (EmailJS)
├── assets/ images/ · projects/ · icons/ · fonts/
├── sitemap.xml · robots.txt · .nojekyll
```

## Run locally
Open `index.html` in a browser. For best results use a tiny local server (project detail pages read the URL):
```bash
python3 -m http.server 8000     # then open http://localhost:8000
```
(or the "Live Server" extension in VS Code).

## Update contact details
Open `js/main.js` and edit the `SITE` object at the top (email, WhatsApp number in international format, LinkedIn, GitHub, availability). Every page updates automatically. Also replace the placeholder email in the HTML fallbacks if you wish (they are overwritten by JavaScript).

## Add, edit or remove projects
Open `js/projects.js`. Each project is one object in the `PROJECTS` array:
```js
{ id: 'my-project',               // unique, used in the URL: project-details.html?id=my-project
  title: 'My Project', category: 'Business',
  description: 'Short summary.',
  image: 'assets/projects/my-project.jpg',
  technologies: ['HTML5','CSS3'],
  liveUrl: 'https://…',           // leave '' to show "Live demo coming soon"
  details: { overview:'…', objectives:[…], design:[…], development:[…],
             gallery:['assets/projects/my-project-2.jpg'] } }
```
Copy an object to add one, delete an object to remove one. Filters, cards, details and previous/next links update by themselves. The six included projects are **demonstration concepts** and are labelled "Demo project".

## Replace images
- Project images: put files in `assets/projects/` and change the `image` / `gallery` paths (use ~1600×1000 px, JPG/WebP).
- Profile photo: replace `assets/images/profile-placeholder.svg` (or change the `src` in `index.html` and `about.html`; 4:5 ratio).
- CV: there is no CV button because no real CV exists. If you add `assets/cv.pdf`, add `<a class="btn" href="assets/cv.pdf" download>Download CV</a>` in `about.html`.

## Configure EmailJS (contact form)
1. Create a free account at emailjs.com and add an **Email Service**.
2. Create an **Email Template** using these variables: `{{from_name}}`, `{{reply_to}}`, `{{subject}}`, `{{project_type}}`, `{{message}}`.
3. Copy your **Public Key**, **Service ID** and **Template ID** into `EMAILJS_CONFIG` at the top of `js/contact.js`.
   In the template's **To Email** field put your Gmail address, and set **Reply-To** to `{{reply_to}}`.
   If you deploy to a custom domain, check EmailJS → Account → Security for any allowed-domain restriction.
4. Only use these public values. Never paste a private key into frontend code.

Until configured, the form shows a warning and refuses to "send" — it never fakes success.

## GSAP and Three.js
- Both load from cdnjs in the bottom of every page. If they fail, content stays visible and the CSS gradient background is used.
- Animations: `js/animations.js` (add `data-reveal` to any element to get a scroll reveal).
- Background: `js/three-background.js` — change `COUNT` for particle count, colours in the `0x…` values. It is reduced on mobile, paused in hidden tabs and removed if WebGL is unavailable or motion is reduced.

## Colours and fonts
Edit the variables in `:root` at the top of `css/style.css`.

## Deploy to GitHub Pages
1. Create a free account at github.com, then **New repository** (e.g. `ismail-studio`, Public).
2. Upload **the contents** of this folder (drag all files into the repo page → *Commit changes*). `index.html` must be at the repo root.
3. Go to **Settings → Pages**.
4. Under *Build and deployment*, set **Source: Deploy from a branch**, **Branch: main**, folder **/ (root)**, then **Save**.
5. After a minute your site is live at `https://YOUR-USERNAME.github.io/ismail-studio/`.
6. Edit `sitemap.xml` and `robots.txt` to replace `YOUR-USERNAME.github.io/ismail-studio` with the real address.
7. **Custom domain later:** buy a domain, add it under *Settings → Pages → Custom domain*, create the DNS records GitHub lists, tick *Enforce HTTPS*, then update `sitemap.xml` and `robots.txt` again.

## Quality checklist
All pages and links are relative; no frameworks; keyboard-accessible navigation and forms; `prefers-reduced-motion` respected.

## Liquid navbar
- `js/liquid-nav.js` + `css/liquid-nav.css` turn the header links (`<nav class="nav-links">`) into an animated liquid-glass pill (WebGL water shader, CSS fallback without WebGL). Links stay in the HTML, so nothing breaks without JS.
- Add or rename a menu item by editing the links in each page's header; give it an icon / effect in the `ICONS` and `FX` tables at the top of `js/liquid-nav.js`.
- Under 1180px it shows icons only; under 900px (tablet portrait + phones) it becomes a floating icon bar at the bottom and replaces the burger menu (burger + overlay stay in the HTML but are hidden). Respects `prefers-reduced-motion`.
- Based on Nimbus UI · Liquid Navbar by guglielmogiannattasio.it.

## Animated gradient background (optional)
- `js/animated-gradient.js` + `css/animated-gradient.css`: animated radial gradient with an optional breathing effect (vanilla port of AnimatedGradientBackground).
- Add `data-animated-gradient` to any section (plus `data-breathing="true"`, `data-colors`, `data-stops`, etc.) and include the two files on that page. See `gradient-demo.html` (not linked anywhere; safe to delete).
- Currently used on all main pages: the home hero (`<section class="hero">`) and the page headers (`<header class="page-hero">`) of about, contact, process, services and work. On `project-details.html` the hero is built in `js/projects.js`, which starts the gradient right after rendering. Remove the `data-animated-gradient …` attributes (and that block in `projects.js`) to turn it off; edit the colours once per page in `data-colors`.

## Pixel flow field (optional, not used on any page yet)
- `js/pixel-flow-field.js` + `css/pixel-flow-field.css`: a canvas of tiny pixels that drifts like a flow field, spells a word (or image) and reacts to the pointer (vanilla port of PixelFlowField).
- Give any container a height and add `data-pixel-flow-field data-text="ismail"` (options: `data-shape`, `data-cell-size`, `data-gap`, `data-speed`, `data-colors`, `data-src`, …). See `pixel-flow-demo.html` (not linked anywhere; safe to delete).
- From JS: `var f = PixelFlowField.init(el)`, then `f.scatter()`, `f.update({...})`, `f.destroy()`.

