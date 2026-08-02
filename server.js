import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:5000";

app.use(cors());
app.use(express.json());

// Proxy API requests to Python Backend Server (Render.com / Local Flask API)
app.use("/api", async (req, res) => {
  try {
    const targetUrl = `${BACKEND_URL}/api${req.url}`;
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      params: req.query,
      headers: { ...req.headers, host: undefined }
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(502).json({
        error: "Python Backend Unreachable",
        details: `Ensure backend is running at ${BACKEND_URL}`,
        message: error.message
      });
    }
  }
});

// Serve React Static Production Build
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🌐 ALPHA QUANT NODE.JS FRONTEND SERVER ONLINE...`);
  console.log(`[*] Frontend URL: http://localhost:${PORT}`);
  console.log(`[*] Proxying API requests to Python Backend: ${BACKEND_URL}\n`);
});
