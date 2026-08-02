import React, { useState, useEffect } from 'react';
import axios from 'axios';
const API_BASE = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? 'https://alpha-quant-bot-b.onrender.com' : '');

const fmtPrice = (val) => {
  const p = Number(val || 0);
  if (p === 0) return '$0.00';
  if (p < 0.000001) return `$${p.toFixed(10)}`;
  if (p < 0.0001) return `$${p.toFixed(8)}`;
  if (p < 0.01) return `$${p.toFixed(6)}`;
  if (p < 1) return `$${p.toFixed(4)}`;
  return `$${p.toFixed(2)}`;
};

export default function App() {
  const [mode, setMode] = useState('existing'); // 'existing', 'new', 'history'
  const [symbols, setSymbols] = useState('BTC,ETH,SOL,BNB,DOGE,PEPE,WIF,SHIB');
  const [query, setQuery] = useState('SOL');
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [activeSignals, setActiveSignals] = useState([]);
  const [historyData, setHistoryData] = useState(null);
  const [status, setStatus] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('Never');
  const [selectedToken, setSelectedToken] = useState(null);
  const [toast, setToast] = useState(null);
  const [autoLoop, setAutoLoop] = useState(false);

  useEffect(() => {
    fetchStatus();
    if (mode === 'history') {
      fetchHistoryAndActive();
    } else {
      runScan();
    }
  }, [mode]);

  useEffect(() => {
    let interval = null;
    if (autoLoop) {
      showToastMessage('⏳ 24/7 Auto-Monitoring Enabled (5m loop)');
      interval = setInterval(() => {
        if (mode === 'history') fetchHistoryAndActive();
        else runScan();
      }, 300000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoLoop, mode, symbols, query]);

  const showToastMessage = (msg) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {}
  };

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/status`);
      setStatus(res.data);
    } catch (e) {
      console.warn('Backend API status check failed');
    }
  };

  const fetchHistoryAndActive = async () => {
    setLoading(true);
    try {
      const [actRes, histRes] = await Promise.all([
        axios.get(`${API_BASE}/api/signals/active`),
        axios.get(`${API_BASE}/api/signals/performance?days=30`),
      ]);
      setActiveSignals(actRes.data.active_signals || []);
      setHistoryData(histRes.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      showToastMessage('⚠️ Failed to load Supabase DB history');
    } finally {
      setLoading(false);
    }
  };

  const runScan = async () => {
    setLoading(true);
    try {
      const paramName = mode === 'new' ? 'query' : 'symbols';
      const paramVal = mode === 'new' ? query : symbols;
      const res = await axios.get(
        `${API_BASE}/api/scan?mode=${mode}&${paramName}=${encodeURIComponent(paramVal)}`
      );

      const data = res.data;
      setTokens(data.tokens || []);
      setLastUpdated(data.timestamp || 'Just now');

      if (data.valid_low_risk_signals > 0) {
        playAlertSound();
        showToastMessage(
          `🔥 Found ${data.valid_low_risk_signals} High-Confidence Signals (Score ≥ 70)!`
        );
      }
      if (data.tp_sl_closed_in_scan > 0) {
        showToastMessage(
          `🎯 ${data.tp_sl_closed_in_scan} Trade(s) hit TP / SL and saved to Supabase!`
        );
      }
    } catch (e) {
      showToastMessage('⚠️ Failed to connect to Python Backend REST API');
    } finally {
      setLoading(false);
    }
  };

  const handleTestTelegram = async () => {
    try {
      const res = await axios.post(`${API_BASE}/api/telegram/test`);
      if (res.data.success) {
        showToastMessage('✅ Telegram alert sent successfully to your phone!');
      } else {
        showToastMessage('⚠️ ' + res.data.message);
      }
    } catch (e) {
      showToastMessage('⚠️ Failed to connect to /api/telegram/test');
    }
  };

  const validSignalsCount = tokens.filter((t) => t.is_valid_signal).length;
  const highestToken = tokens.length > 0 ? tokens[0] : null;

  return (
    <div className="app-container">
      <div className="app-background">
        <div className="glow-orb orb-1"></div>
        <div className="glow-orb orb-2"></div>
      </div>

      {/* NAVBAR */}
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">
            <span className="pulse-dot"></span>⚡
          </div>
          <div className="brand-text">
            <h1>ALPHA QUANT</h1>
            <p>INSTITUTIONAL LOW-RISK CRYPTO ENGINE (RR 1:2)</p>
          </div>
        </div>

        <div className="header-status">
          <div className="status-badge">
            <span className="dot cmc-dot"></span>
            <span>CMC: Protected</span>
          </div>
          <div className="status-badge">
            <span className="dot online-dot"></span>
            <span>Supabase DB: {status?.supabase_enabled ? 'ONLINE' : 'OFF'}</span>
          </div>
          <div className="status-badge">
            <span className="dot tg-dot"></span>
            <span>Telegram: {status?.telegram_enabled ? 'ACTIVE' : 'OFF'}</span>
          </div>
          <button className="btn btn-secondary btn-telegram" onClick={handleTestTelegram}>
            Test Telegram Alert
          </button>
        </div>
      </header>

      <main className="container">
        {/* MODE SELECTOR */}
        <div className="mode-bar">
          <div className="mode-tabs">
            <button
              className={`tab-btn ${mode === 'existing' ? 'active' : ''}`}
              onClick={() => setMode('existing')}
            >
              <span className="tab-icon">📊</span>
              <div className="tab-content">
                <span className="tab-title">Existing Listed Coins</span>
                <span className="tab-sub">CVD Absorption &amp; Pump Prediction</span>
              </div>
            </button>
            <button
              className={`tab-btn ${mode === 'new' ? 'active' : ''}`}
              onClick={() => setMode('new')}
            >
              <span className="tab-icon">🎯</span>
              <div className="tab-content">
                <span className="tab-title">New DEX Launches</span>
                <span className="tab-sub">Anti-Rug Audit &amp; Smart Money Sniper</span>
              </div>
            </button>
            <button
              className={`tab-btn ${mode === 'history' ? 'active' : ''}`}
              onClick={() => setMode('history')}
            >
              <span className="tab-icon">📜</span>
              <div className="tab-content">
                <span className="tab-title">Active Signals &amp; History</span>
                <span className="tab-sub">Supabase 30-Day Monthly Performance</span>
              </div>
            </button>
          </div>

          <div className="rule-badge">
            <div className="rule-icon">🛡️</div>
            <div className="rule-text">
              <strong>STRICT 1:2 RISK-REWARD MONITOR</strong>
              <span>Take Profit (+7%) | Stop Loss (-3.5%) | Score ≥ 70 Only</span>
            </div>
          </div>
        </div>

        {/* STATS CARDS (Dynamic based on mode) */}
        {mode === 'history' ? (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Closed Trades (30D)</div>
              <div className="stat-value">{historyData?.total_closed_trades || 0}</div>
              <div className="stat-meta">Supabase Verified Ledger</div>
            </div>
            <div className="stat-card highlight-card">
              <div className="stat-label">Bot Win Rate (TP Hits)</div>
              <div className="stat-value stat-signal">
                {historyData?.win_rate_percent || 0}
                <span className="stat-unit">%</span>
              </div>
              <div className="stat-meta">
                {historyData?.wins_tp_count || 0} Wins / {historyData?.losses_sl_count || 0} Losses
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Cumulative PnL</div>
              <div
                className="stat-value"
                style={{
                  color:
                    (historyData?.total_pnl_percent || 0) >= 0
                      ? 'var(--signal-strong)'
                      : '#EF4444',
                }}
              >
                {(historyData?.total_pnl_percent || 0) >= 0 ? '+' : ''}
                {historyData?.total_pnl_percent || 0}
                <span className="stat-unit">%</span>
              </div>
              <div className="stat-meta">Net Return Across 1 Month</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Monitored Signals</div>
              <div className="stat-value stat-top">{activeSignals.length}</div>
              <div className="stat-meta">Continuous 5m TP / SL Loop</div>
            </div>
          </div>
        ) : (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Scan Mode</div>
              <div className="stat-value">{mode === 'new' ? 'NEW DEX SNIPER' : 'EXISTING COINS'}</div>
              <div className="stat-meta">Institutional Confluence Scorer</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Analyzed</div>
              <div className="stat-value">{tokens.length}</div>
              <div className="stat-meta">Real-Time API Scanning</div>
            </div>
            <div className="stat-card highlight-card">
              <div className="stat-label">Low-Risk Signals (≥70)</div>
              <div className="stat-value stat-signal">{validSignalsCount}</div>
              <div className="stat-meta">Top-Tier High-Confidence Setups</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Highest Confluence Score</div>
              <div className="stat-value stat-top">
                {highestToken ? highestToken.total_score : 0}
                <span className="stat-unit">/100</span>
              </div>
              <div className="stat-meta">
                {highestToken ? `${highestToken.name} (${highestToken.symbol})` : '—'}
              </div>
            </div>
          </div>
        )}

        {/* SCAN CONTROLS */}
        <div className="controls-bar">
          <div className="input-group">
            <label>
              {mode === 'history'
                ? 'Database Query Scope'
                : mode === 'new'
                ? 'Search Chain / DEX Query'
                : 'Symbols to Scan (Comma Separated)'}
            </label>
            {mode === 'history' ? (
              <input type="text" readOnly value="Supabase Table: alpha_signals (30-Day Ledger)" />
            ) : (
              <input
                type="text"
                value={mode === 'new' ? query : symbols}
                onChange={(e) =>
                  mode === 'new' ? setQuery(e.target.value) : setSymbols(e.target.value)
                }
                placeholder={mode === 'new' ? 'SOL, ETH, BASE...' : 'BTC,ETH,SOL,PEPE...'}
              />
            )}
          </div>
          <div className="control-actions">
            <button
              className="btn btn-primary"
              onClick={mode === 'history' ? fetchHistoryAndActive : runScan}
              disabled={loading}
            >
              <span>⚡</span>
              <span>{loading ? 'Processing...' : mode === 'history' ? 'Refresh DB Ledger' : 'Run Scanner Now'}</span>
            </button>
            <div className="toggle-group">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={autoLoop}
                  onChange={(e) => setAutoLoop(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
              <span className="toggle-label">24/7 Auto-Monitor (5m)</span>
            </div>
          </div>
        </div>

        {/* MAIN RESULTS SECTION */}
        {mode === 'history' ? (
          <>
            {/* 1. ACTIVE MONITORED SIGNALS TABLE */}
            <section className="results-card">
              <div className="results-header">
                <div className="results-title">
                  <h2>⏳ Active Signals — Live 1:2 Risk-Reward Monitoring</h2>
                  <p>Bot is checking prices every 5 minutes until Take Profit or Stop Loss hits</p>
                </div>
                <div className="last-updated">Last update: {lastUpdated}</div>
              </div>
              <div className="table-responsive">
                <table className="quant-table">
                  <thead>
                    <tr>
                      <th>SYMBOL</th>
                      <th>ENTRY PRICE</th>
                      <th>LIVE PRICE</th>
                      <th>LIVE P&L</th>
                      <th>TAKE PROFIT (TP)</th>
                      <th>STOP LOSS (SL)</th>
                      <th>RR RATIO</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSignals.length === 0 ? (
                      <tr className="empty-row">
                        <td colSpan="8">
                          No signals currently open. Bot will auto-add signals when Score ≥ 70 is detected!
                        </td>
                      </tr>
                    ) : (
                      activeSignals.map((s, idx) => (
                        <tr key={idx}>
                          <td>
                            <div className="symbol-cell">
                              <div className="symbol-icon">{s.symbol.substring(0, 3)}</div>
                              <div>
                                <div className="symbol-name">{s.symbol}</div>
                                <div className="symbol-sub">{s.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="price-text">{fmtPrice(s.entry_price)}</td>
                          <td className="price-text" style={{ fontWeight: 'bold' }}>
                            {fmtPrice(s.current_price || s.entry_price)}
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                fontSize: '13px',
                                fontFamily: 'var(--font-mono)',
                                background:
                                  (s.unrealized_pnl_pct || 0) >= 0
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : 'rgba(239, 68, 68, 0.15)',
                                color:
                                  (s.unrealized_pnl_pct || 0) >= 0
                                    ? 'var(--signal-strong)'
                                    : '#EF4444',
                              }}
                            >
                              {(s.unrealized_pnl_pct || 0) >= 0 ? '+' : ''}
                              {Number(s.unrealized_pnl_pct || 0).toFixed(2)}%
                            </span>
                          </td>
                          <td style={{ color: 'var(--signal-strong)', fontWeight: 'bold' }}>
                            {fmtPrice(s.tp_price)} (+7.0%)
                          </td>
                          <td style={{ color: '#EF4444', fontWeight: 'bold' }}>
                            {fmtPrice(s.sl_price)} (-3.5%)
                          </td>
                          <td>1 : {s.rr_ratio || 2.0}</td>
                          <td>
                            <span className="status-active">⏳ MONITORING</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 2. 30-DAY CHRONOLOGICAL HISTORY TABLE */}
            <section className="results-card" style={{ marginTop: '24px' }}>
              <div className="results-header">
                <div className="results-title">
                  <h2>📜 30-Day Chronological Signal Ledger (Supabase DB)</h2>
                  <p>Complete transparent record of closed Take Profit and Stop Loss trades</p>
                </div>
              </div>
              <div className="table-responsive">
                <table className="quant-table">
                  <thead>
                    <tr>
                      <th>SYMBOL</th>
                      <th>ENTRY PRICE</th>
                      <th>CLOSED PRICE</th>
                      <th>FINAL RESULT</th>
                      <th>PROFIT / LOSS %</th>
                      <th>CLOSED AT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!historyData?.history || historyData.history.length === 0) ? (
                      <tr className="empty-row">
                        <td colSpan="6">
                          No closed trades recorded in the last 30 days. Active trades will appear here automatically when closed!
                        </td>
                      </tr>
                    ) : (
                      historyData.history.map((h, idx) => {
                        const isWin = h.status === 'CLOSED_TP';
                        return (
                          <tr key={idx}>
                            <td>
                              <div className="symbol-cell">
                                <div className="symbol-icon">{h.symbol.substring(0, 3)}</div>
                                <div>
                                  <div className="symbol-name">{h.symbol}</div>
                                  <div className="symbol-sub">{h.name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="price-text">{fmtPrice(h.entry_price)}</td>
                            <td className="price-text">{fmtPrice(h.close_price)}</td>
                            <td>
                              {isWin ? (
                                <span className="status-tp">🎯 TAKE PROFIT WIN</span>
                              ) : (
                                <span className="status-sl">🛑 STOP LOSS EXIT</span>
                              )}
                            </td>
                            <td
                              style={{
                                color: isWin ? 'var(--signal-strong)' : '#EF4444',
                                fontWeight: 'bold',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              {isWin ? '+' : ''}
                              {Number(h.pnl_percent || 0).toFixed(2)}%
                            </td>
                            <td style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                              {h.closed_at ? new Date(h.closed_at).toLocaleString() : '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <section className="results-card">
            <div className="results-header">
              <div className="results-title">
                <h2>
                  {mode === 'new'
                    ? 'New DEX Token Anti-Rug Sniper'
                    : 'Existing Coins Quantitative Matrix'}
                </h2>
                <p>100-Point Institutional Confluence Scoring System</p>
              </div>
              <div className="last-updated">Last update: {lastUpdated}</div>
            </div>

            <div className="table-responsive">
              <table className="quant-table">
                <thead>
                  <tr>
                    <th>SYMBOL</th>
                    <th>PRICE (USD)</th>
                    {mode === 'new' ? (
                      <>
                        <th>LIQUIDITY (USD)</th>
                        <th>SMART MONEY BUY%</th>
                        <th>ANTI-RUG AUDIT</th>
                      </>
                    ) : (
                      <>
                        <th>24H CHG</th>
                        <th>CVD WHALE BUY%</th>
                        <th>ORDERBOOK DEPTH</th>
                        <th>RSI / MOMENTUM</th>
                      </>
                    )}
                    <th>CONFLUENCE SCORE</th>
                    <th>SIGNAL DECISION</th>
                    <th>AUDIT PILLARS</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.length === 0 ? (
                    <tr className="empty-row">
                      <td colSpan="9">
                        {loading ? '⏳ Running Quantitative Alpha Scanner...' : 'No tokens found.'}
                      </td>
                    </tr>
                  ) : (
                    tokens.map((t, i) => {
                      const score = t.total_score;
                      const scoreClass =
                        score >= 85 ? 'score-85' : score >= 70 ? 'score-70' : 'score-low';
                      const tagClass =
                        score >= 85
                          ? 'tag-strong'
                          : score >= 70
                          ? 'tag-moderate'
                          : 'tag-none';
                      const icon = score >= 85 ? '🔥' : score >= 70 ? '📈' : '🚫';
                      const buyPct = Math.round((t.cvd_ratio || t.buy_ratio || 0.5) * 100);

                      return (
                        <tr key={i}>
                          <td>
                            <div className="symbol-cell">
                              <div className="symbol-icon">{t.symbol.substring(0, 3)}</div>
                              <div>
                                <div className="symbol-name">{t.symbol}</div>
                                <div className="symbol-sub">{t.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="price-text">
                            {fmtPrice(t.price)}
                          </td>
                          {mode === 'new' ? (
                            <>
                              <td className="price-text">
                                ${Number(t.liquidity || 0).toLocaleString()}
                              </td>
                              <td>
                                <span>{buyPct}% Buys</span>
                                <div className="progress-container">
                                  <div
                                    className={`progress-bar ${
                                      buyPct >= 65
                                        ? 'high'
                                        : buyPct >= 50
                                        ? 'mid'
                                        : 'low'
                                    }`}
                                    style={{ width: `${buyPct}%` }}
                                  ></div>
                                </div>
                              </td>
                              <td>
                                {t.anti_rug_passed ? (
                                  <span style={{ color: 'var(--signal-strong)' }}>
                                    PASSED ✅
                                  </span>
                                ) : (
                                  <span style={{ color: '#EF4444' }}>FLAGGED ❌</span>
                                )}
                              </td>
                            </>
                          ) : (
                            <>
                              <td
                                className={
                                  t.change_24h >= 0 ? 'chg-pos' : 'chg-neg'
                                }
                              >
                                {t.change_24h >= 0 ? '+' : ''}
                                {t.change_24h?.toFixed(2)}%
                              </td>
                              <td>
                                <span>{buyPct}% Buy</span>
                                <div className="progress-container">
                                  <div
                                    className={`progress-bar ${
                                      buyPct >= 65
                                        ? 'high'
                                        : buyPct >= 55
                                        ? 'mid'
                                        : 'low'
                                    }`}
                                    style={{ width: `${buyPct}%` }}
                                  ></div>
                                </div>
                              </td>
                              <td>
                                <span className="price-text">
                                  {t.ob_imbalance || '1.00'}x
                                </span>{' '}
                                Bid
                              </td>
                              <td>
                                <span className="price-text">
                                  {t.rsi || '50.0'}
                                </span>
                              </td>
                            </>
                          )}
                          <td>
                            <span className={`score-badge ${scoreClass}`}>
                              {score} / 100
                            </span>
                          </td>
                          <td>
                            <span className={`action-tag ${tagClass}`}>
                              {icon} {t.signal}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-audit"
                              onClick={() => setSelectedToken(t)}
                            >
                              View Audit 📊
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* PILLARS MODAL */}
      {selectedToken && (
        <div className="modal-overlay" onClick={() => setSelectedToken(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>
                  {selectedToken.name} ({selectedToken.symbol}) — Confluence Breakdown
                </h3>
                <p>
                  Total Institutional Score: {selectedToken.total_score} / 100 |{' '}
                  {selectedToken.signal}
                </p>
              </div>
              <button className="modal-close" onClick={() => setSelectedToken(null)}>
                &times;
              </button>
            </div>

            <div className="modal-body">
              {Object.entries(selectedToken.pillar_scores || {}).map(([key, val], idx) => {
                const names = {
                  cvd_absorption: ['1. CVD Whale Volume Absorption', 25],
                  orderbook_imbalance: ['2. Orderbook Bid-Ask Wall Imbalance', 25],
                  mcap_liquidity: ['3. Liquidity Velocity / Vol-to-MCap', 20],
                  momentum_rsi: ['4. RSI Breakout / Short Squeeze Setup', 15],
                  volatility_squeeze: ['5. Volatility Contraction / Squeeze', 15],
                  anti_rug_safety: ['1. Anti-Rug & Honeypot Safety', 30],
                  smart_money_buys: ['2. Smart Money Whale Buy Ratio', 25],
                  lp_depth: ['3. Liquidity Pool Depth Score', 25],
                  dex_volume: ['4. Early DEX Volume Aggression', 20],
                };
                const [label, max] = names[key] || [key, 25];
                const pct = (val / max) * 100;

                return (
                  <div className="pillar-row" key={idx}>
                    <div className="pillar-top">
                      <span>{label}</span>
                      <span className="pillar-score">
                        {val} / {max} Pts
                      </span>
                    </div>
                    <div className="pillar-track">
                      <div className="pillar-fill" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedToken(null)}>
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="toast-notification">
          <span>✅ {toast}</span>
        </div>
      )}
    </div>
  );
}
