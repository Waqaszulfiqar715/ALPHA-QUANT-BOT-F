# ⚡ Vercel Deployment Guide — Alpha Quant React Dashboard

Aap ka React + Vite Frontend ab **Vercel.com** par 1-minute me deploy hone ke liye 100% configured hai!
Project me **`vercel.json`** aur **`VITE_BACKEND_URL`** automatic proxy support add kar di gayi hai taake Vercel Frontend bina kisi CORS error ke aap ke Python Backend ke sath connect ho sake.

---

## ⭐ Method 1: Automatic Deploy via Vercel Dashboard (GitHub Import) — RECOMMENDED

1. **GitHub Par Push Karein:**
   * Apni frontend repository (`frontend/`) ko `https://github.com/Waqaszulfiqar715/ALPHA-QUANT-BOT-F.git` par push karein.
2. **Vercel Dashboard Open Karein:**
   * Open [https://vercel.com/new](https://vercel.com/new) aur apna GitHub account connect karein.
3. **Repository Import Karein:**
   * **`ALPHA-QUANT-BOT-F`** repository select kar ke **Import** par click karein.
4. **Vercel Build Settings (Auto-Detected):**
   * **Framework Preset:** `Vite` (Vercel automatically detect kar lega)
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
5. **Environment Variable Set Karein (Optional):**
   * Expand **Environment Variables** section aur ye variable add karein:
     * **Name:** `VITE_BACKEND_URL`
     * **Value:** `https://alpha-quant-bot-b.onrender.com` *(Ya jo bhi aap ka Render.com Python Backend URL hai)*
   * *(Note: Agar aap set nahi bhi karte tab bhi humari `vercel.json` file automatically `/api/*` calls ko Render.com backend par route kar deti hai!)*
6. **Deploy Par Click Karein:**
   * Sirf **15 seconds** me aap ka Ultra-Modern React Institutional Terminal `https://your-project.vercel.app` par live ho jayega! 🚀

---

## 🛠️ Method 2: Deploy via Vercel CLI (Direct From Windows Terminal)

Agar aap apne command prompt / PowerShell se direct deploy karna chahte hain:

1. **Vercel CLI Install Karein:**
   ```powershell
   npm install -g vercel
   ```
2. **Frontend Folder se Vercel Deploy Command Chalayein:**
   ```powershell
   cd frontend
   vercel --prod
   ```
3. Terminal me puchay gaye sawaalat (Yes/No) par `Y` enter karein — aap ki application turant Vercel par live ho jayegi!
