// Institutional Quantitative Alpha Dashboard Engine (Frontend JS)

let currentMode = "existing";
let scanInterval = null;
let lastTokensData = [];

document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initControls();
    initModal();
    checkBackendStatus();
    runScanner(); // Execute initial scan on load
});

// --- Tab Mode Switcher ---
function initTabs() {
    const tabExisting = document.getElementById("tab-existing");
    const tabNew = document.getElementById("tab-new");
    const statMode = document.getElementById("stat-mode");
    const tableHeading = document.getElementById("table-heading");
    const tableSubheading = document.getElementById("table-subheading");
    const tableHeadRow = document.getElementById("table-head-row");
    const inputLabel = document.getElementById("input-label");
    const scanInput = document.getElementById("scan-input");

    tabExisting.addEventListener("click", () => {
        if (currentMode === "existing") return;
        currentMode = "existing";
        tabExisting.classList.add("active");
        tabNew.classList.remove("active");

        statMode.textContent = "EXISTING COINS";
        tableHeading.textContent = "Existing Coins Quantitative Matrix";
        tableSubheading.textContent = "Ranking assets by 100-Point Institutional Confluence Scoring System (CVD + Orderbook)";
        inputLabel.textContent = "Symbols to Scan (Comma Separated)";
        scanInput.value = "BTC,ETH,SOL,BNB,DOGE,PEPE,WIF,SHIB";

        tableHeadRow.innerHTML = `
            <th>SYMBOL</th>
            <th>PRICE (USD)</th>
            <th>24H CHG</th>
            <th>CVD WHALE BUY%</th>
            <th>ORDERBOOK DEPTH</th>
            <th>RSI / MOMENTUM</th>
            <th>CONFLUENCE SCORE</th>
            <th>SIGNAL DECISION</th>
            <th>AUDIT PILLARS</th>
        `;

        runScanner();
    });

    tabNew.addEventListener("click", () => {
        if (currentMode === "new") return;
        currentMode = "new";
        tabNew.classList.add("active");
        tabExisting.classList.remove("active");

        statMode.textContent = "NEW DEX LAUNCHES";
        tableHeading.textContent = "New DEX Token Anti-Rug Sniper";
        tableSubheading.textContent = "Automated Anti-Rug & Honeypot Audit + Smart Money Whale Cluster Buy Ratio";
        inputLabel.textContent = "Search Chain / DEX Token Query";
        scanInput.value = "SOL";

        tableHeadRow.innerHTML = `
            <th>SYMBOL</th>
            <th>PRICE (USD)</th>
            <th>LIQUIDITY (USD)</th>
            <th>SMART MONEY BUY%</th>
            <th>ANTI-RUG AUDIT</th>
            <th>CONFLUENCE SCORE</th>
            <th>SIGNAL DECISION</th>
            <th>AUDIT PILLARS</th>
        `;

        runScanner();
    });
}

// --- Control Buttons & Toggles ---
function initControls() {
    const btnScan = document.getElementById("btn-scan");
    const btnTestTg = document.getElementById("btn-test-telegram");
    const toggleLoop = document.getElementById("toggle-loop");

    btnScan.addEventListener("click", () => {
        runScanner();
    });

    btnTestTg.addEventListener("click", async () => {
        btnTestTg.disabled = true;
        btnTestTg.innerHTML = `⏳ Testing...`;
        try {
            const res = await fetch("/api/telegram/test", { method: "POST" });
            const data = await res.json();
            if (data.success) {
                showToast("✅ Telegram Alert sent successfully to your phone!");
            } else {
                showToast("⚠️ " + data.message);
            }
        } catch (e) {
            showToast("⚠️ Failed to connect to REST server (/api/telegram/test). Ensure api.py is running.");
        }
        btnTestTg.disabled = false;
        btnTestTg.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2"></path></svg>
            Test Telegram Alert
        `;
    });

    toggleLoop.addEventListener("change", (e) => {
        if (e.target.checked) {
            showToast("⏳ 24/7 Auto-Monitoring enabled (5-minute scan loop)");
            scanInterval = setInterval(runScanner, 300000); // 300 seconds = 5m
        } else {
            showToast("⏹️ Auto-Monitoring disabled");
            if (scanInterval) clearInterval(scanInterval);
        }
    });
}

// --- Backend Health Status Check ---
async function checkBackendStatus() {
    try {
        const res = await fetch("/api/status");
        if (res.ok) {
            const data = await res.json();
            const tgStatus = document.getElementById("telegram-status");
            const solStatus = document.getElementById("sol-rpc-status");

            if (data.telegram_enabled) {
                tgStatus.innerHTML = `<span class="dot online-dot"></span><span>Telegram Bot: ENABLED ✅</span>`;
            } else {
                tgStatus.innerHTML = `<span class="dot tg-dot"></span><span>Telegram Bot: OFF (Edit .env)</span>`;
            }

            if (data.rpc_health && data.rpc_health.solana) {
                solStatus.innerHTML = `<span class="dot online-dot"></span><span>Solana RPC: Online ✅</span>`;
            } else {
                solStatus.innerHTML = `<span class="dot cmc-dot"></span><span>Solana RPC: Fallback ⚠️</span>`;
            }
        }
    } catch (e) {
        console.warn("API server offline or unreachable");
    }
}

// --- Execute Scanner ---
async function runScanner() {
    const btnScan = document.getElementById("btn-scan");
    const scanBtnText = document.getElementById("scan-btn-text");
    const tableBody = document.getElementById("table-body");
    const lastUpdated = document.getElementById("last-updated");
    const scanInput = document.getElementById("scan-input").value.trim();

    btnScan.disabled = true;
    scanBtnText.textContent = "Scanning...";
    tableBody.innerHTML = `
        <tr class="empty-row">
            <td colspan="9">⏳ Fetching live quantitative metrics from CoinMarketCap, Binance &amp; DexScreener...</td>
        </tr>
    `;

    try {
        const paramName = currentMode === "new" ? "query" : "symbols";
        const url = `/api/scan?mode=${currentMode}&${paramName}=${encodeURIComponent(scanInput)}`;
        const res = await fetch(url);

        if (!res.ok) throw new Error("HTTP " + res.status);

        const data = await res.json();
        lastTokensData = data.tokens || [];
        renderResults(data);
        lastUpdated.textContent = "Last update: " + data.timestamp;

        // Trigger Beep Alert if any valid low-risk setup found
        if (data.valid_low_risk_signals > 0) {
            playAlertSound();
            showToast(`🔥 Found ${data.valid_low_risk_signals} High-Confidence Signals (Score ≥ 70)!`);
        }
    } catch (err) {
        tableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="9" style="color: #EF4444;">❌ Failed to connect to local API server. Ensure you ran: python api.py</td>
            </tr>
        `;
        showToast("⚠️ Could not reach server. Please run python api.py in terminal.");
    } finally {
        btnScan.disabled = false;
        scanBtnText.textContent = "Run Scanner Now";
    }
}

// --- Render Table & Stat Cards ---
function renderResults(data) {
    const tableBody = document.getElementById("table-body");
    const statScanned = document.getElementById("stat-scanned");
    const statValid = document.getElementById("stat-valid");
    const statHighest = document.getElementById("stat-highest");
    const statHighestSymbol = document.getElementById("stat-highest-symbol");

    const tokens = data.tokens || [];
    statScanned.textContent = tokens.length;
    statValid.textContent = data.valid_low_risk_signals || 0;

    if (tokens.length > 0) {
        const top = tokens[0];
        statHighest.innerHTML = `${top.total_score}<span class="stat-unit">/100</span>`;
        statHighestSymbol.textContent = `${top.name} (${top.symbol})`;
    } else {
        statHighest.innerHTML = `0<span class="stat-unit">/100</span>`;
        statHighestSymbol.textContent = "—";
    }

    if (tokens.length === 0) {
        tableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="9">No tokens found matching your search query.</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = tokens.map((token, index) => {
        const score = token.total_score;
        let scoreClass = "score-low";
        if (score >= 85) scoreClass = "score-85";
        else if (score >= 70) scoreClass = "score-70";

        let tagClass = "tag-none";
        let actionIcon = "🚫";
        if (score >= 85) { tagClass = "tag-strong"; actionIcon = "🔥"; }
        else if (score >= 70) { tagClass = "tag-moderate"; actionIcon = "📈"; }

        if (currentMode === "new") {
            const buyPct = Math.round((token.buy_ratio || 0.5) * 100);
            const rugStatus = token.anti_rug_passed 
                ? `<span style="color: var(--signal-strong);">PASSED ✅</span>` 
                : `<span style="color: #EF4444;">FLAGGED ❌</span>`;

            return `
                <tr>
                    <td>
                        <div class="symbol-cell">
                            <div class="symbol-icon">${token.symbol.substring(0,3)}</div>
                            <div>
                                <div class="symbol-name">${token.symbol}</div>
                                <div class="symbol-sub">${token.name}</div>
                            </div>
                        </div>
                    </td>
                    <td class="price-text">$${Number(token.price).toFixed(6)}</td>
                    <td class="price-text">$${Number(token.liquidity || 0).toLocaleString()}</td>
                    <td>
                        <span>${buyPct}% Buys</span>
                        <div class="progress-container">
                            <div class="progress-bar ${buyPct >= 65 ? 'high' : buyPct >= 50 ? 'mid' : 'low'}" style="width: ${buyPct}%"></div>
                        </div>
                    </td>
                    <td>${rugStatus}</td>
                    <td>
                        <span class="score-badge ${scoreClass}">${score} / 100</span>
                    </td>
                    <td>
                        <span class="action-tag ${tagClass}">${actionIcon} ${token.signal}</span>
                    </td>
                    <td>
                        <button class="btn btn-audit" onclick="openModal(${index})">View Audit 📊</button>
                    </td>
                </tr>
            `;
        } else {
            const chg = token.change_24h || 0;
            const chgClass = chg >= 0 ? "chg-pos" : "chg-neg";
            const chgSign = chg >= 0 ? "+" : "";
            const buyPct = Math.round((token.cvd_ratio || 0.5) * 100);

            return `
                <tr>
                    <td>
                        <div class="symbol-cell">
                            <div class="symbol-icon">${token.symbol.substring(0,3)}</div>
                            <div>
                                <div class="symbol-name">${token.symbol}</div>
                                <div class="symbol-sub">${token.name}</div>
                            </div>
                        </div>
                    </td>
                    <td class="price-text">$${Number(token.price).toFixed(4)}</td>
                    <td class="${chgClass}">${chgSign}${chg.toFixed(2)}%</td>
                    <td>
                        <span>${buyPct}% Buy</span>
                        <div class="progress-container">
                            <div class="progress-bar ${buyPct >= 65 ? 'high' : buyPct >= 55 ? 'mid' : 'low'}" style="width: ${buyPct}%"></div>
                        </div>
                    </td>
                    <td><span class="price-text">${token.ob_imbalance || '1.00'}x</span> Bid Depth</td>
                    <td><span class="price-text">${token.rsi || '50.0'}</span></td>
                    <td>
                        <span class="score-badge ${scoreClass}">${score} / 100</span>
                    </td>
                    <td>
                        <span class="action-tag ${tagClass}">${actionIcon} ${token.signal}</span>
                    </td>
                    <td>
                        <button class="btn btn-audit" onclick="openModal(${index})">View Pillars 📊</button>
                    </td>
                </tr>
            `;
        }
    }).join("");
}

// --- 100-Point Confluence Modal ---
function initModal() {
    const modalClose = document.getElementById("modal-close");
    const modalCloseBtn = document.getElementById("modal-close-btn");
    const overlay = document.getElementById("modal-overlay");

    const closeModal = () => {
        overlay.classList.remove("active");
    };

    modalClose.addEventListener("click", closeModal);
    modalCloseBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
    });
}

window.openModal = function(index) {
    const token = lastTokensData[index];
    if (!token) return;

    const overlay = document.getElementById("modal-overlay");
    const title = document.getElementById("modal-title");
    const subtitle = document.getElementById("modal-subtitle");
    const bodyContent = document.getElementById("modal-body-content");

    title.textContent = `${token.name} (${token.symbol}) — Confluence Breakdown`;
    subtitle.textContent = `Total Institutional Score: ${token.total_score} / 100 | ${token.signal}`;

    const pillars = token.pillar_scores || {};
    let html = "";

    if (currentMode === "new") {
        html = `
            <div class="pillar-row">
                <div class="pillar-top">
                    <span>1. Anti-Rug &amp; Honeypot Safety</span>
                    <span class="pillar-score">${pillars.anti_rug_safety || 0} / 30 Pts</span>
                </div>
                <div class="pillar-track"><div class="pillar-fill" style="width: ${(pillars.anti_rug_safety/30)*100}%"></div></div>
            </div>
            <div class="pillar-row">
                <div class="pillar-top">
                    <span>2. Smart Money Whale Buy Ratio</span>
                    <span class="pillar-score">${pillars.smart_money_buys || 0} / 25 Pts</span>
                </div>
                <div class="pillar-track"><div class="pillar-fill" style="width: ${(pillars.smart_money_buys/25)*100}%"></div></div>
            </div>
            <div class="pillar-row">
                <div class="pillar-top">
                    <span>3. Liquidity Pool Depth Score</span>
                    <span class="pillar-score">${pillars.lp_depth || 0} / 25 Pts</span>
                </div>
                <div class="pillar-track"><div class="pillar-fill" style="width: ${(pillars.lp_depth/25)*100}%"></div></div>
            </div>
            <div class="pillar-row">
                <div class="pillar-top">
                    <span>4. Early DEX Volume Aggression</span>
                    <span class="pillar-score">${pillars.dex_volume || 0} / 20 Pts</span>
                </div>
                <div class="pillar-track"><div class="pillar-fill" style="width: ${(pillars.dex_volume/20)*100}%"></div></div>
            </div>
        `;
    } else {
        html = `
            <div class="pillar-row">
                <div class="pillar-top">
                    <span>1. CVD Whale Volume Absorption</span>
                    <span class="pillar-score">${pillars.cvd_absorption || 0} / 25 Pts</span>
                </div>
                <div class="pillar-track"><div class="pillar-fill" style="width: ${(pillars.cvd_absorption/25)*100}%"></div></div>
            </div>
            <div class="pillar-row">
                <div class="pillar-top">
                    <span>2. Orderbook Bid-Ask Wall Imbalance</span>
                    <span class="pillar-score">${pillars.orderbook_imbalance || 0} / 25 Pts</span>
                </div>
                <div class="pillar-track"><div class="pillar-fill" style="width: ${(pillars.orderbook_imbalance/25)*100}%"></div></div>
            </div>
            <div class="pillar-row">
                <div class="pillar-top">
                    <span>3. Liquidity Velocity / Vol-to-MCap</span>
                    <span class="pillar-score">${pillars.mcap_liquidity || 0} / 20 Pts</span>
                </div>
                <div class="pillar-track"><div class="pillar-fill" style="width: ${(pillars.mcap_liquidity/20)*100}%"></div></div>
            </div>
            <div class="pillar-row">
                <div class="pillar-top">
                    <span>4. RSI Breakout / Short Squeeze Setup</span>
                    <span class="pillar-score">${pillars.momentum_rsi || 0} / 15 Pts</span>
                </div>
                <div class="pillar-track"><div class="pillar-fill" style="width: ${(pillars.momentum_rsi/15)*100}%"></div></div>
            </div>
            <div class="pillar-row">
                <div class="pillar-top">
                    <span>5. Volatility Contraction / Squeeze</span>
                    <span class="pillar-score">${pillars.volatility_squeeze || 0} / 15 Pts</span>
                </div>
                <div class="pillar-track"><div class="pillar-fill" style="width: ${(pillars.volatility_squeeze/15)*100}%"></div></div>
            </div>
        `;
    }

    bodyContent.innerHTML = html;
    overlay.classList.add("active");
};

// --- Toast & Sound Utilities ---
function showToast(message) {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toast-message");
    toastMsg.textContent = message;
    toast.classList.add("active");
    setTimeout(() => {
        toast.classList.remove("active");
    }, 4000);
}

function playAlertSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
        osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.3); // E6 note
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
        // Autoplay restrictions may apply
    }
}
