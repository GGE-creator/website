# Giovanni Everduin — Personal Website

A dual-mode personal portfolio with a toggle between **Boardroom** (professional banking/fintech persona) and **After Hours** (crypto/web3/hip-hop/art collector persona).

## 🚀 Live

Deployed on [Vercel](https://vercel.com) — see deployment instructions below.

## 🏗 Stack

- Pure HTML / CSS / JavaScript — no frameworks, no build step
- Google Fonts: Outfit, Space Mono, DM Sans
- Accent: Dutch Orange `#FF6B2B`
- Fully responsive (5 breakpoints: 1024px → 380px)

## 📁 Structure

```
├── index.html          # Single-page site (all CSS/JS inline)
├── images/
│   ├── blazer.jpeg     # Hero background (Boardroom)
│   ├── hoodie.jpeg     # Hero background (After Hours)
│   ├── pink.jpeg       # Photo banner (Boardroom)
│   ├── polo.jpeg       # Photo banner (After Hours)
│   ├── speaking.jpeg   # Available for future use
│   ├── speaking2.jpeg  # Motto background (Boardroom)
│   └── stage.jpeg      # Motto background (After Hours)
├── vercel.json         # Vercel config
├── .gitignore
└── README.md
```

## 🔧 Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the GitHub repo
4. Framework Preset: **Other** (no build needed)
5. Click **Deploy**

That's it — no build command, no output directory config needed.

## ✏️ Customization

- **Social feed section**: Currently uses placeholder content. Replace with live API data or update the HTML directly.
- **Images**: Drop replacements into `/images/` with the same filenames.
- **Content**: All text is in `index.html` — search for `content-pro` (Boardroom) and `content-perso` (After Hours) to find mode-specific content.
