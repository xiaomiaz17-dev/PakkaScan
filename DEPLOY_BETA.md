# PakkaScan — deploy closed-beta scan app

## Why Railway (or Render), not Vercel/Netlify Functions

Photo OCR and multi-page analysis can take **1–5 minutes**.  
Short serverless timeouts will kill the request. Use a **persistent Node** host.

## Recommended: Railway

1. Create account at https://railway.app
2. **New Project** → **Deploy from GitHub** (push this repo)  
   **or** Railway CLI from this folder:
   ```bash
   npm i -g @railway/cli
   railway login
   railway init
   railway up
   ```
3. Settings:
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
   - **Node:** 20+
4. After deploy, open the public URL, e.g. `https://pakkascan-scan.up.railway.app/app/scan`
5. Optional: add custom domain `app.pakkascan.com` in Railway + DNS CNAME at Namecheap

## Alternative: Render

1. https://render.com → **New Web Service**
2. Connect repo or upload
3. Build: `npm install && npm run build`
4. Start: `npm start`
5. Instance: at least **512MB** (1GB better for OCR)

## What beta users open

`https://YOUR-HOST/app/scan`

Link it from the marketing site (Upload / beta) when ready.

## Honest limits (leave visible on the page)

- Best: text PDF or pasted text
- Photos: OCR works but weak on handwriting / stamp paper
- Multi-page photos: slower (minutes)

## Env (optional for later)

No secrets required for the current beta scan path.  
Later: `DATABASE_URL`, storage keys, etc.

## Local verify before deploy

```bash
npm install
npm run build
npm start
# open http://localhost:3000/app/scan
```
