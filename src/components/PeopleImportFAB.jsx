import { useState, useCallback, useRef, useEffect } from "react";
import { useOrgConfig } from "../contexts/OrgConfigContext";
import { DEFAULT_HIERARCHY } from "../utils/hierarchy";

const DEFAULT_API = import.meta.env.VITE_BACKEND_URL;

function orgLevels(hierarchy) {
  const src = Array.isArray(hierarchy) && hierarchy.length > 0 ? hierarchy : DEFAULT_HIERARCHY;
  return [...src]
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
    .map((lv) => ({
      key: lv.key || lv.field || "",
      label: lv.label || lv.key || lv.field || "",
      level: lv.level,
    }))
    .filter((lv) => lv.key);
}

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadTemplate(levels, topLeaders) {
  const headers = ["Name", "Surname", "Phone", "Email", "Gender", "DOB", "Address", "InvitedBy", ...levels.map((l) => l.label)];
  const topName = topLeaders?.male || topLeaders?.female || "Top Leader";
  const levelColsFor = (name) => levels.map((l, i) => (i === 0 ? name : ""));
  const rows = [
    ["John", "Doe", "+27123456789", "john@example.com", "Male", "1990-01-01", "1 Main Street", topName, ...levelColsFor(topName)],
    ["Jane", "Smith", "+27876543210", "jane@example.com", "Female", "1995-06-15", "2 Main Street", "John Doe", ...levelColsFor("John Doe")],
  ];
  const csv = "\uFEFF" + [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "people-import-template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let _styleEl = null;

function syncStyles(isDark) {
  if (typeof document === "undefined") return;
  if (!_styleEl) {
    _styleEl = document.createElement("style");
    _styleEl.id = "pifab-styles";
    document.head.appendChild(_styleEl);
  }
  _styleEl.textContent = buildStyles(isDark);
}

function fmtBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function getStoredToken() {
  try {
    return (
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("access_token") ||
      ""
    );
  } catch { return ""; }
}

const STEPS = ["Upload", "Preview", "Confirm", "Done"];

export default function PeopleImportFAB({
  onImportComplete,
  token: propToken,
  apiBase = DEFAULT_API,
  disabled = false,
  themeMode = "dark",         
}) {
  const isDark = themeMode !== "light";

  const { orgConfig, topLeaders } = useOrgConfig();
  const levels = orgLevels(orgConfig?.hierarchy);
  const hierarchyBody = JSON.stringify(levels.map((l) => ({ level: l.level, key: l.key, label: l.label })));

  useEffect(() => {
    syncStyles(isDark);
  }, [isDark]);

  syncStyles(isDark);

  const [open,      setOpen]      = useState(false);
  const [step,      setStep]      = useState(0);
  const [file,      setFile]      = useState(null);
  const [dragOver,  setDragOver]  = useState(false);
  const [org,       setOrg]       = useState("");
  const [dryRun,    setDryRun]    = useState(false);
  const [preview,   setPreview]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [results,   setResults]   = useState(null);
  const [filter,    setFilter]    = useState("all");
  const [error,     setError]     = useState("");

  const inputRef   = useRef(null);
  const overlayRef = useRef(null);

  const token = propToken || getStoredToken();
  const authH = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function handleClose() {
    setOpen(false);
    setTimeout(reset, 300);
  }

  function reset() {
    setStep(0); setFile(null); setPreview(null); setResults(null);
    setError(""); setProgress(0); setFilter("all"); setDragOver(false);
  }

  function pickFile(f) {
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      setError("Please upload a .xlsx, .xls, or .csv file.");
      return;
    }
    setFile(f);
    setPreview(null);
    setResults(null);
    setError("");
  }

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }, []);

  async function fetchPreview() {
    if (!file) return;
    setLoading(true); setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("hierarchy", hierarchyBody);
      const res  = await fetch(`${apiBase}/people/import/preview-columns`, {
        method: "POST", headers: authH, body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Preview failed");
      setPreview(data);
      setStep(1);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function runImport() {
    if (!file) return;
    setLoading(true); setProgress(15); setError("");
    try {
      const form   = new FormData();
      form.append("file", file);
      form.append("hierarchy", hierarchyBody);
      const params = new URLSearchParams();
      if (org)    params.set("organization", org);
      if (dryRun) params.set("dry_run", "true");

      setProgress(40);
      const res  = await fetch(`${apiBase}/people/import/spreadsheet?${params}`, {
        method: "POST", headers: authH, body: form,
      });
      setProgress(85);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Import failed");
      setProgress(100);
      setResults(data);
      setStep(3);

      if (onImportComplete && !dryRun) {
        console.log("Import complete, refreshing people data...");
        setTimeout(() => { onImportComplete(); }, 500);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const rows     = results?.rows || [];
  const filtered =
    filter === "all"    ? rows
    : filter === "ok"   ? rows.filter(r => r.status === "inserted" || r.status === "would_insert")
    : filter === "skip" ? rows.filter(r => r.status === "skipped")
    : rows.filter(r => r.status === "error");

  return (
    <>
      {/* ── FAB ── */}
      <button
        className="pifab-btn"
        onClick={() => setOpen(true)}
        title="Import people from spreadsheet"
        disabled={disabled}
        style={{ opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
      >
        <span className="pifab-icon">⬆</span>
        <span className="pifab-label">Import</span>
      </button>

      {/* ── Overlay ── */}
      {open && (
        <div
          ref={overlayRef}
          className="pifab-overlay"
          onClick={(e) => e.target === overlayRef.current && handleClose()}
        >
          <div className={`pifab-modal ${open ? "pifab-modal--in" : ""}`}>

            {/* modal header */}
            <div className="pifab-modal-header">
              <div className="pifab-modal-title">
                <div>
                  <div className="pifab-modal-heading">Import People</div>
                  <div className="pifab-modal-sub">Upload a spreadsheet — hierarchy auto-resolved</div>
                </div>
              </div>
              <button className="pifab-close" onClick={handleClose}>✕</button>
            </div>

            {/* step rail */}
            <div className="pifab-steps">
              {STEPS.map((s, i) => (
                <div
                  key={i}
                  className={`pifab-step ${i === step ? "pifab-step--active" : i < step ? "pifab-step--done" : ""}`}
                >
                  <div className="pifab-step-dot">{i < step ? "✓" : i + 1}</div>
                  <span>{s}</span>
                </div>
              ))}
            </div>

            {/* modal body */}
            <div className="pifab-body">

              {error && (
                <div className="pifab-alert pifab-alert--warn">{error}</div>
              )}

              {/* ── STEP 0: Upload ── */}
              {step === 0 && (
                <div className="pifab-section">
                  <div
                    className={`pifab-drop ${dragOver ? "pifab-drop--over" : ""} ${file ? "pifab-drop--chosen" : ""}`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    onClick={() => !file && inputRef.current?.click()}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      style={{ display: "none" }}
                      onChange={e => e.target.files[0] && pickFile(e.target.files[0])}
                    />
                    <div className="pifab-drop-icon">{file ? "📊" : "☁️"}</div>
                    <div className="pifab-drop-title">
                      {file ? "File ready!" : "Drag & drop your spreadsheet"}
                    </div>
                    <div className="pifab-drop-sub">
                      {file ? "Click 'Preview Columns' below" : "or click to browse"}
                    </div>
                    <div className="pifab-chips">
                      {[".xlsx", ".xls", ".csv"].map(c => (
                        <span key={c} className="pifab-chip">{c}</span>
                      ))}
                    </div>
                  </div>

                  <div className="pifab-alert pifab-alert--info">
                    Expected leader columns: <strong>{levels.map(l => l.label).join(", ")}</strong>
                    {levels[0] && <> — fill the first column; deeper levels resolve from <strong>InvitedBy</strong> ancestry.</>}
                  </div>

                  <div className="pifab-field">
                    <label>No spreadsheet handy?</label>
                    <button
                      type="button"
                      className="pifab-btn-secondary"
                      onClick={() => downloadTemplate(levels, topLeaders)}
                      style={{ width: "100%", padding: "12px", justifyContent: "center" }}
                    >
                      ⬇ Download template for your church
                    </button>
                  </div>

                  {file && (
                    <div className="pifab-filepill">
                      <span className="pifab-filepill-icon">📄</span>
                      <div>
                        <div className="pifab-filepill-name">{file.name}</div>
                        <div className="pifab-filepill-size">{fmtBytes(file.size)}</div>
                      </div>
                      <button
                        className="pifab-filepill-rm"
                        onClick={() => { setFile(null); inputRef.current && (inputRef.current.value = ""); }}
                      >✕</button>
                    </div>
                  )}

                  <div className="pifab-field">
                    <label>Override organization <span className="pifab-optional">(optional)</span></label>
                    <input
                      value={org}
                      onChange={e => setOrg(e.target.value)}
                      placeholder="e.g. Active Church"
                    />
                  </div>

                  <div className="pifab-toggle" onClick={() => setDryRun(v => !v)}>
                    <div className={`pifab-toggle-track ${dryRun ? "on" : ""}`}>
                      <div className="pifab-toggle-knob" />
                    </div>
                    <span>Dry run — preview only, nothing saved</span>
                    {dryRun && <span className="pifab-badge pifab-badge--warn">Active</span>}
                  </div>
                </div>
              )}

              {/* ── STEP 1: Column preview ── */}
              {step === 1 && preview && (
                <div className="pifab-section">
                  <div className="pifab-alert pifab-alert--info">
                    {preview.column_mapping?.filter(c => c.status === "mapped").length} columns mapped,{" "}
                    {preview.column_mapping?.filter(c => c.status === "ignored").length} ignored
                    · {preview.total_rows} rows detected
                  </div>

                  <div className="pifab-table-wrap">
                    <table className="pifab-table">
                      <thead>
                        <tr>
                          <th>Spreadsheet column</th>
                          <th></th>
                          <th>Internal field</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(preview.column_mapping || []).map((cm, i) => (
                          <tr key={i}>
                            <td><code className="pifab-code">{cm.original}</code></td>
                            <td className="pifab-arrow">→</td>
                            <td>
                              {cm.maps_to
                                ? <code className="pifab-code pifab-code--blue">{cm.maps_to}</code>
                                : <span className="pifab-muted">—</span>}
                            </td>
                            <td>
                              <span className={`pifab-badge ${cm.status === "mapped" ? "pifab-badge--green" : "pifab-badge--muted"}`}>
                                {cm.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {(preview.sample_rows || []).length > 0 && (
                    <>
                      <div className="pifab-section-label">Sample data (first 3 rows)</div>
                      <div className="pifab-table-wrap">
                        <table className="pifab-table pifab-table--mono">
                          <thead>
                            <tr>
                              {Object.keys(preview.sample_rows[0]).map(k => (
                                <th key={k}>{k}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {preview.sample_rows.map((row, ri) => (
                              <tr key={ri}>
                                {Object.values(row).map((v, ci) => (
                                  <td key={ci} title={String(v ?? "")}>
                                    {String(v ?? "—").slice(0, 28)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── STEP 2: Confirm ── */}
              {step === 2 && (
                <div className="pifab-section">
                  <div className="pifab-summary-grid">
                    {[
                      { label: "Rows",        value: preview?.total_rows ?? "?",   color: "var(--pifab-accent-blue)" },
                      { label: "File",         value: file?.name ?? "—",            color: "var(--pifab-text-primary)", small: true },
                      { label: "Organization", value: org || "From file",           color: org ? "var(--pifab-accent-green)" : "var(--pifab-text-muted)" },
                      { label: "Mode",         value: dryRun ? "DRY RUN" : "LIVE", color: dryRun ? "var(--pifab-accent-yellow)" : "var(--pifab-accent-green)" },
                    ].map(s => (
                      <div key={s.label} className="pifab-summary-card">
                        <div className="pifab-summary-val" style={{ color: s.color, fontSize: s.small ? 13 : undefined }}>
                          {s.value}
                        </div>
                        <div className="pifab-summary-lab">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="pifab-alert pifab-alert--info">
                    <strong>InvitedBy</strong> names are matched against the People database to
                    resolve <strong>LeaderId</strong> &amp; <strong>LeaderPath</strong> as ObjectIds —
                    identical to manual signup.
                  </div>

                  {dryRun && (
                    <div className="pifab-alert pifab-alert--warn">
                      Dry run ON — no records will be written.
                    </div>
                  )}

                  {loading && (
                    <div className="pifab-progress">
                      <div className="pifab-progress-bar">
                        <div className="pifab-progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="pifab-progress-label">Importing… {progress}%</div>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 3: Results ── */}
              {step === 3 && results && (
                <div className="pifab-section">
                  <div className="pifab-stat-row">
                    {[
                      { n: results.total_rows, l: "Total",   c: "var(--pifab-accent-blue)" },
                      { n: results.inserted,   l: results.dry_run ? "Preview" : "Inserted", c: "var(--pifab-accent-green)" },
                      { n: results.skipped,    l: "Skipped", c: "var(--pifab-accent-yellow)" },
                      { n: results.errors,     l: "Errors",  c: "var(--pifab-accent-red)" },
                    ].map(s => (
                      <div key={s.l} className="pifab-stat">
                        <div className="pifab-stat-num" style={{ color: s.c }}>{s.n}</div>
                        <div className="pifab-stat-lab">{s.l}</div>
                      </div>
                    ))}
                  </div>

                  {!results.dry_run && results.inserted > 0 && (
                    <div className="pifab-alert pifab-alert--success">
                      {results.inserted} people imported with LeaderPath resolved.
                    </div>
                  )}

                  {results.dry_run && (
                    <div className="pifab-alert pifab-alert--warn">
                      Dry run complete. Disable dry run and re-import to save.
                    </div>
                  )}

                  <div className="pifab-filters">
                    {[
                      { k: "all",  l: `All (${rows.length})` },
                      { k: "ok",   l: `${results.dry_run ? "Preview" : "Inserted"} (${results.inserted})` },
                      { k: "skip", l: `Skipped (${results.skipped})` },
                      { k: "err",  l: `Errors (${results.errors})` },
                    ].map(f => (
                      <button
                        key={f.k}
                        className={`pifab-filter-btn ${filter === f.k ? "active" : ""}`}
                        onClick={() => setFilter(f.k)}
                      >{f.l}</button>
                    ))}
                  </div>

                  <div className="pifab-rows">
                    {filtered.length === 0
                      ? <div className="pifab-empty">No rows match.</div>
                      : filtered.map((r, i) => (
                        <div key={i} className="pifab-row">
                          <div className="pifab-row-info">
                            <div className="pifab-row-name">
                              {r.person || "—"}
                              {r.email && <span className="pifab-row-email"> · {r.email}</span>}
                              <span className="pifab-chip" style={{ marginLeft: 6 }}>row {r.row}</span>
                            </div>
                            {(r.leader_path?.length > 0) && (
                              <div className="pifab-lpath">
                                {r.leader_path.map((lp, li) => (
                                  <span key={li}>
                                    {li > 0 && <span className="pifab-lpath-sep">›</span>}
                                    <span className="pifab-lpath-node">{lp.slice(-8)}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                            {r.reason && <div className="pifab-row-reason">{r.reason}</div>}
                            {r.error  && <div className="pifab-row-reason">{r.error}</div>}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>

            {/* modal footer */}
            <div className="pifab-footer">
              {step === 0 && (
                <>
                  <button className="pifab-btn-secondary" onClick={handleClose}>Cancel</button>
                  <button
                    className="pifab-btn-primary"
                    onClick={fetchPreview}
                    disabled={!file || loading}
                  >
                    {loading ? <><span className="pifab-spinner" /> Analysing…</> : "Preview Columns →"}
                  </button>
                </>
              )}
              {step === 1 && (
                <>
                  <button className="pifab-btn-secondary" onClick={() => setStep(0)}>← Back</button>
                  <button className="pifab-btn-primary" onClick={() => setStep(2)}>Continue →</button>
                </>
              )}
              {step === 2 && (
                <>
                  <button className="pifab-btn-secondary" onClick={() => setStep(1)} disabled={loading}>← Back</button>
                  <button className="pifab-btn-primary" onClick={runImport} disabled={loading}>
                    {loading
                      ? <><span className="pifab-spinner" /> Importing…</>
                      : dryRun ? "Run Dry Import" : "Import People"}
                  </button>
                </>
              )}
              {step === 3 && (
                <>
                  <button className="pifab-btn-secondary" onClick={reset}>Import Another</button>
                  {results?.dry_run && (
                    <button
                      className="pifab-btn-primary"
                      onClick={() => { setDryRun(false); setStep(2); setResults(null); }}
                    >Run Live Import</button>
                  )}
                  {!results?.dry_run && (
                    <button className="pifab-btn-primary" onClick={handleClose}>Done ✓</button>
                  )}
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}

function buildStyles(isDark) {
  const t = isDark ? {
    bgModal:        "#161b22",
    bgBody:         "#161b22",
    bgFooter:       "#161b22",
    bgHeader:       "#161b22",
    bgInput:        "#0d1117",
    bgCard:         "#0d1117",
    bgPill:         "#21262d",
    bgTableHead:    "#0d1117",
    bgToggle:       "#0d1117",
    bgDropHover:    "rgba(31,111,235,0.04)",
    bgDropOver:     "rgba(31,111,235,0.08)",
    bgDropChosen:   "rgba(35,134,54,0.04)",
    bgStepDone:     "#238636",
    bgStepActive:   "#1f6feb",
    bgFilterActive: "#1f6feb",
    bgFilter:       "#21262d",
    border:         "#30363d",
    borderInput:    "#30363d",
    borderFocus:    "#1f6feb",
    borderDropHover:"#388bfd",
    borderDropChosen:"#238636",
    borderModal:    "#30363d",
    textPrimary:    "#e6edf3",
    textSecondary:  "#8b949e",
    textMuted:      "#8b949e",
    rowHover:       "rgba(255,255,255,0.03)",
    overlay:        "rgba(1,4,9,0.75)",
    accentBlue:     "#79c0ff",
    accentGreen:    "#3fb950",
    accentYellow:   "#d29922",
    accentRed:      "#da3633",
    alertWarnBg:    "rgba(210,153,34,0.1)",
    alertWarnBorder:"rgba(210,153,34,0.3)",
    alertInfoBg:    "rgba(31,111,235,0.08)",
    alertInfoBorder:"rgba(31,111,235,0.2)",
    alertSuccessBg: "rgba(35,134,54,0.1)",
    alertSuccessBorder:"rgba(35,134,54,0.3)",
    codeBg:         "#21262d",
    codeBorder:     "#30363d",
    codeBlueBg:     "rgba(31,111,235,0.12)",
    codeBlueFg:     "#79c0ff",
    codeBlueBorder: "rgba(31,111,235,0.2)",
    lpathBg:        "rgba(31,111,235,0.1)",
    lpathFg:        "#79c0ff",
    scrollbar:      "#30363d",
    btnPrimaryBg:   "#238636",
    btnPrimaryBdr:  "#238636",
    btnPrimaryHov:  "#2ea043",
    btnSecBg:       "#21262d",
    btnSecBdr:      "#30363d",
    btnSecHov:      "#2d333b",
    tableRowBdr:    "rgba(48,54,61,.4)",
    progressTrack:  "#30363d",
    fabShadow:      "0 4px 24px rgba(31,111,235,0.45), 0 2px 8px rgba(0,0,0,0.3)",
    fabShadowHov:   "0 8px 32px rgba(31,111,235,0.55), 0 4px 12px rgba(0,0,0,0.3)",
  } : {
    bgModal:        "#ffffff",
    bgBody:         "#ffffff",
    bgFooter:       "#f9fafb",
    bgHeader:       "#ffffff",
    bgInput:        "#f3f4f6",
    bgCard:         "#f9fafb",
    bgPill:         "#f3f4f6",
    bgTableHead:    "#f3f4f6",
    bgToggle:       "#f3f4f6",
    bgDropHover:    "rgba(31,111,235,0.03)",
    bgDropOver:     "rgba(31,111,235,0.06)",
    bgDropChosen:   "rgba(35,134,54,0.03)",
    bgStepDone:     "#1a7f37",
    bgStepActive:   "#0969da",
    bgFilterActive: "#0969da",
    bgFilter:       "#f3f4f6",
    border:         "#d0d7de",
    borderInput:    "#d0d7de",
    borderFocus:    "#0969da",
    borderDropHover:"#0969da",
    borderDropChosen:"#1a7f37",
    borderModal:    "#d0d7de",
    textPrimary:    "#1f2328",
    textSecondary:  "#656d76",
    textMuted:      "#9198a1",
    rowHover:       "rgba(0,0,0,0.03)",
    overlay:        "rgba(0,0,0,0.45)",
    accentBlue:     "#0969da",
    accentGreen:    "#1a7f37",
    accentYellow:   "#9a6700",
    accentRed:      "#cf222e",
    alertWarnBg:    "rgba(154,103,0,0.08)",
    alertWarnBorder:"rgba(154,103,0,0.25)",
    alertInfoBg:    "rgba(9,105,218,0.06)",
    alertInfoBorder:"rgba(9,105,218,0.2)",
    alertSuccessBg: "rgba(26,127,55,0.08)",
    alertSuccessBorder:"rgba(26,127,55,0.2)",
    codeBg:         "#f3f4f6",
    codeBorder:     "#d0d7de",
    codeBlueBg:     "rgba(9,105,218,0.08)",
    codeBlueFg:     "#0969da",
    codeBlueBorder: "rgba(9,105,218,0.2)",
    lpathBg:        "rgba(9,105,218,0.08)",
    lpathFg:        "#0969da",
    scrollbar:      "#d0d7de",
    btnPrimaryBg:   "#1a7f37",
    btnPrimaryBdr:  "#1a7f37",
    btnPrimaryHov:  "#2da44e",
    btnSecBg:       "#f3f4f6",
    btnSecBdr:      "#d0d7de",
    btnSecHov:      "#e9ebee",
    tableRowBdr:    "rgba(208,215,222,0.6)",
    progressTrack:  "#d0d7de",
    fabShadow:      "0 4px 24px rgba(9,105,218,0.25), 0 2px 8px rgba(0,0,0,0.12)",
    fabShadowHov:   "0 8px 32px rgba(9,105,218,0.35), 0 4px 12px rgba(0,0,0,0.15)",
  };

  return `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Sora:wght@400;600;700&display=swap');

/* ── CSS custom props so inline style refs work too ── */
:root {
  --pifab-accent-blue:   ${t.accentBlue};
  --pifab-accent-green:  ${t.accentGreen};
  --pifab-accent-yellow: ${t.accentYellow};
  --pifab-accent-red:    ${t.accentRed};
  --pifab-text-primary:  ${t.textPrimary};
  --pifab-text-muted:    ${t.textMuted};
}

/* ── FAB ── */
.pifab-btn {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 22px;
  background: linear-gradient(135deg, #1f6feb 0%, #238636 100%);
  color: #fff;
  border: none;
  border-radius: 50px;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: ${t.fabShadow};
  transition: transform .18s, box-shadow .18s;
  letter-spacing: .3px;
}
.pifab-btn:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.03);
  box-shadow: ${t.fabShadowHov};
}
.pifab-btn:active { transform: scale(.97); }
.pifab-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.pifab-icon { font-size: 16px; }

/* ── Overlay ── */
.pifab-overlay {
  position: fixed;
  inset: 0;
  z-index: 1300;
  background: ${t.overlay};
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pifab-fade-in .2s ease;
}
@keyframes pifab-fade-in { from { opacity: 0; } to { opacity: 1; } }

/* ── Modal ── */
.pifab-modal {
  width: 100%;
  max-width: 680px;
  max-height: 90vh;
  background: ${t.bgModal};
  border: 1px solid ${t.borderModal};
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: scale(0.96);
  opacity: 0;
  transition: transform .28s cubic-bezier(.22,.68,0,1.2), opacity .2s ease;
  box-shadow: 0 16px 64px rgba(0,0,0,${isDark ? "0.5" : "0.15"});
}
.pifab-modal--in { transform: scale(1); opacity: 1; }

/* ── Header ── */
.pifab-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid ${t.border};
  flex-shrink: 0;
  background: ${t.bgHeader};
}
.pifab-modal-title { display: flex; align-items: center; gap: 14px; }
.pifab-modal-heading {
  font-family: 'Sora', sans-serif;
  font-size: 17px; font-weight: 700;
  color: ${t.textPrimary};
}
.pifab-modal-sub {
  font-family: 'Sora', sans-serif;
  font-size: 12px; color: ${t.textSecondary}; margin-top: 2px;
}
.pifab-close {
  background: none; border: none;
  color: ${t.textSecondary}; font-size: 20px; cursor: pointer;
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s, color .15s; line-height: 1;
}
.pifab-close:hover { background: ${t.bgPill}; color: ${t.textPrimary}; }

/* ── Steps ── */
.pifab-steps {
  display: flex; padding: 12px 24px;
  border-bottom: 1px solid ${t.border}; flex-shrink: 0;
  background: ${t.bgHeader};
}
.pifab-step {
  flex: 1; display: flex; align-items: center; gap: 8px;
  font-family: 'Sora', sans-serif; font-size: 12px; font-weight: 600;
  color: ${t.textMuted}; position: relative;
}
.pifab-step::after {
  content: ''; position: absolute; right: 0; top: 50%;
  transform: translateY(-50%); width: 20px; height: 1px;
  background: ${t.border};
}
.pifab-step:last-child::after { display: none; }
.pifab-step--active { color: ${t.textPrimary}; }
.pifab-step--done   { color: ${t.accentGreen}; }
.pifab-step-dot {
  width: 20px; height: 20px; border-radius: 50%;
  border: 1.5px solid currentColor;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; flex-shrink: 0;
}
.pifab-step--done .pifab-step-dot   { background: ${t.bgStepDone};   border-color: ${t.bgStepDone};   color: #fff; }
.pifab-step--active .pifab-step-dot { background: ${t.bgStepActive}; border-color: ${t.bgStepActive}; color: #fff; }

/* ── Body ── */
.pifab-body {
  flex: 1; overflow-y: auto;
  padding: 20px 24px; background: ${t.bgBody};
  scrollbar-width: thin; scrollbar-color: ${t.scrollbar} transparent;
}
.pifab-body::-webkit-scrollbar { width: 4px; }
.pifab-body::-webkit-scrollbar-thumb { background: ${t.scrollbar}; border-radius: 2px; }
.pifab-section { display: flex; flex-direction: column; gap: 14px; }

/* ── Drop zone ── */
.pifab-drop {
  border: 2px dashed ${t.border}; border-radius: 12px;
  padding: 40px 24px; text-align: center; cursor: pointer;
  transition: border-color .18s, background .18s;
  background: transparent;
}
.pifab-drop:hover        { border-color: ${t.borderDropHover}; background: ${t.bgDropHover}; }
.pifab-drop--over        { border-color: ${t.borderDropHover}; background: ${t.bgDropOver}; }
.pifab-drop--chosen      { border-color: ${t.borderDropChosen}; background: ${t.bgDropChosen}; cursor: default; }
.pifab-drop-icon         { font-size: 36px; margin-bottom: 10px; }
.pifab-drop-title        { font-family: 'Sora', sans-serif; font-size: 15px; font-weight: 600; color: ${t.textPrimary}; }
.pifab-drop-sub          { font-size: 12px; color: ${t.textSecondary}; margin-top: 4px; }
.pifab-chips             { display: flex; gap: 6px; justify-content: center; margin-top: 12px; flex-wrap: wrap; }
.pifab-chip {
  background: ${t.bgPill}; border: 1px solid ${t.border};
  border-radius: 5px; padding: 2px 8px;
  font-size: 11px; font-family: 'JetBrains Mono', monospace; color: ${t.textSecondary};
}

/* ── File pill ── */
.pifab-filepill {
  display: flex; align-items: center; gap: 10px;
  background: ${t.bgPill}; border: 1px solid ${t.border};
  border-radius: 8px; padding: 10px 14px;
}
.pifab-filepill-icon { font-size: 22px; }
.pifab-filepill-name { font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600; color: ${t.textPrimary}; }
.pifab-filepill-size { font-size: 11px; color: ${t.textSecondary}; margin-top: 1px; }
.pifab-filepill-rm {
  margin-left: auto; background: none; border: none;
  color: ${t.textSecondary}; cursor: pointer; font-size: 16px; line-height: 1;
  transition: color .15s;
}
.pifab-filepill-rm:hover { color: ${t.accentRed}; }

/* ── Field ── */
.pifab-field { display: flex; flex-direction: column; gap: 5px; }
.pifab-field label {
  font-family: 'Sora', sans-serif; font-size: 11px; font-weight: 600;
  color: ${t.textSecondary}; text-transform: uppercase; letter-spacing: .5px;
}
.pifab-optional { font-weight: 400; text-transform: none; letter-spacing: 0; }
.pifab-field input {
  background: ${t.bgInput}; border: 1px solid ${t.borderInput}; border-radius: 7px;
  padding: 8px 11px; color: ${t.textPrimary};
  font-family: 'Sora', sans-serif; font-size: 13px; outline: none;
  transition: border-color .15s;
}
.pifab-field input::placeholder { color: ${t.textMuted}; }
.pifab-field input:focus { border-color: ${t.borderFocus}; }

/* ── Toggle ── */
.pifab-toggle {
  display: flex; align-items: center; gap: 10px;
  background: ${t.bgToggle}; border: 1px solid ${t.border}; border-radius: 8px;
  padding: 10px 14px; cursor: pointer; user-select: none;
  font-family: 'Sora', sans-serif; font-size: 13px; color: ${t.textPrimary};
  transition: border-color .15s;
}
.pifab-toggle:hover { border-color: ${t.textSecondary}; }
.pifab-toggle-track {
  width: 34px; height: 18px; background: ${t.border};
  border-radius: 9px; position: relative; transition: background .2s; flex-shrink: 0;
}
.pifab-toggle-track.on { background: ${isDark ? "#238636" : "#1a7f37"}; }
.pifab-toggle-knob {
  position: absolute; top: 2px; left: 2px;
  width: 14px; height: 14px; background: #fff;
  border-radius: 50%; transition: transform .2s;
}
.pifab-toggle-track.on .pifab-toggle-knob { transform: translateX(16px); }

/* ── Alerts ── */
.pifab-alert {
  padding: 10px 14px; border-radius: 8px;
  font-family: 'Sora', sans-serif; font-size: 12px; line-height: 1.5;
}
.pifab-alert--warn    { background: ${t.alertWarnBg};    border: 1px solid ${t.alertWarnBorder};    color: ${t.accentYellow}; }
.pifab-alert--info    { background: ${t.alertInfoBg};    border: 1px solid ${t.alertInfoBorder};    color: ${t.accentBlue}; }
.pifab-alert--success { background: ${t.alertSuccessBg}; border: 1px solid ${t.alertSuccessBorder}; color: ${t.accentGreen}; }

/* ── Table ── */
.pifab-table-wrap { overflow-x: auto; border: 1px solid ${t.border}; border-radius: 8px; }
.pifab-table { width: 100%; border-collapse: collapse; font-family: 'Sora', sans-serif; font-size: 12px; }
.pifab-table th {
  background: ${t.bgTableHead}; padding: 7px 10px; text-align: left;
  color: ${t.textSecondary}; font-size: 10px; text-transform: uppercase;
  letter-spacing: .5px; border-bottom: 1px solid ${t.border}; white-space: nowrap;
}
.pifab-table td {
  padding: 7px 10px; border-bottom: 1px solid ${t.tableRowBdr};
  color: ${t.textPrimary}; white-space: nowrap;
  max-width: 200px; overflow: hidden; text-overflow: ellipsis;
}
.pifab-table tr:last-child td { border-bottom: none; }
.pifab-table--mono td, .pifab-table--mono th { font-family: 'JetBrains Mono', monospace; font-size: 11px; }
.pifab-arrow { color: ${t.textSecondary}; text-align: center; }
.pifab-muted { color: ${t.textMuted}; }
.pifab-code {
  background: ${t.codeBg}; border: 1px solid ${t.codeBorder}; border-radius: 4px;
  padding: 1px 6px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: ${t.textPrimary};
}
.pifab-code--blue { background: ${t.codeBlueBg}; color: ${t.codeBlueFg}; border-color: ${t.codeBlueBorder}; }
.pifab-section-label {
  font-family: 'Sora', sans-serif; font-size: 11px; font-weight: 600;
  color: ${t.textSecondary}; text-transform: uppercase; letter-spacing: .5px; margin-top: 4px;
}

/* ── Badges ── */
.pifab-badge {
  display: inline-flex; align-items: center;
  padding: 2px 7px; border-radius: 4px;
  font-size: 10px; font-weight: 700; font-family: 'JetBrains Mono', monospace;
}
.pifab-badge--green { background: ${isDark ? "rgba(35,134,54,0.2)" : "rgba(26,127,55,0.1)"};   color: ${t.accentGreen}; }
.pifab-badge--muted { background: ${isDark ? "rgba(139,148,158,0.1)" : "rgba(101,109,118,0.1)"}; color: ${t.textSecondary}; }
.pifab-badge--warn  { background: ${isDark ? "rgba(210,153,34,0.15)" : "rgba(154,103,0,0.1)"}; color: ${t.accentYellow}; }

/* ── Summary grid (step 2) ── */
.pifab-summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.pifab-summary-card {
  background: ${t.bgCard}; border: 1px solid ${t.border};
  border-radius: 8px; padding: 12px; text-align: center;
}
.pifab-summary-val {
  font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 700;
  line-height: 1; margin-bottom: 4px; word-break: break-all;
}
.pifab-summary-lab {
  font-family: 'Sora', sans-serif; font-size: 10px;
  color: ${t.textSecondary}; text-transform: uppercase; letter-spacing: .5px;
}

/* ── Progress ── */
.pifab-progress { margin: 4px 0; }
.pifab-progress-bar {
  height: 5px; background: ${t.progressTrack}; border-radius: 3px; overflow: hidden; margin-bottom: 6px;
}
.pifab-progress-fill {
  height: 100%; border-radius: 3px;
  background: linear-gradient(90deg, #1f6feb, #238636);
  transition: width .3s ease;
}
.pifab-progress-label { font-family: 'Sora', sans-serif; font-size: 11px; color: ${t.textSecondary}; }

/* ── Stat row ── */
.pifab-stat-row { display: flex; gap: 12px; }
.pifab-stat {
  flex: 1; background: ${t.bgCard}; border: 1px solid ${t.border};
  border-radius: 8px; padding: 12px; text-align: center;
}
.pifab-stat-num { font-family: 'Sora', sans-serif; font-size: 26px; font-weight: 700; line-height: 1; }
.pifab-stat-lab {
  font-family: 'Sora', sans-serif; font-size: 10px; color: ${t.textSecondary};
  text-transform: uppercase; letter-spacing: .5px; margin-top: 3px;
}

/* ── Filter tabs ── */
.pifab-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.pifab-filter-btn {
  padding: 4px 12px; border-radius: 20px;
  border: 1px solid ${t.border}; background: ${t.bgFilter};
  color: ${t.textSecondary}; font-family: 'Sora', sans-serif; font-size: 11px; font-weight: 600;
  cursor: pointer; transition: all .15s;
}
.pifab-filter-btn.active { background: ${t.bgFilterActive}; border-color: ${t.bgFilterActive}; color: #fff; }

/* ── Result rows ── */
.pifab-rows {
  max-height: 240px; overflow-y: auto;
  display: flex; flex-direction: column; gap: 2px;
}
.pifab-rows::-webkit-scrollbar { width: 3px; }
.pifab-rows::-webkit-scrollbar-thumb { background: ${t.scrollbar}; border-radius: 2px; }
.pifab-row {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 6px 8px; border-radius: 6px;
  font-family: 'Sora', sans-serif; font-size: 12px;
  transition: background .1s;
}
.pifab-row:hover { background: ${t.rowHover}; }
.pifab-row-info  { flex: 1; min-width: 0; }
.pifab-row-name  { font-weight: 600; color: ${t.textPrimary}; }
.pifab-row-email { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: ${t.textSecondary}; }
.pifab-row-reason { font-size: 11px; color: ${t.accentYellow}; margin-top: 2px; }

/* ── Leader path ── */
.pifab-lpath { display: flex; align-items: center; gap: 3px; flex-wrap: wrap; margin-top: 3px; }
.pifab-lpath-node {
  font-size: 10px; font-family: 'JetBrains Mono', monospace;
  background: ${t.lpathBg}; color: ${t.lpathFg};
  padding: 1px 6px; border-radius: 3px;
}
.pifab-lpath-sep { color: ${t.textSecondary}; font-size: 10px; }
.pifab-empty {
  text-align: center; padding: 28px;
  color: ${t.textSecondary}; font-family: 'Sora', sans-serif; font-size: 13px;
}

/* ── Footer ── */
.pifab-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 24px; border-top: 1px solid ${t.border}; flex-shrink: 0;
  background: ${t.bgFooter};
}
.pifab-btn-primary {
  padding: 8px 18px; border-radius: 7px;
  background: ${t.btnPrimaryBg}; border: 1px solid ${t.btnPrimaryBdr}; color: #fff;
  font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 700;
  cursor: pointer; display: flex; align-items: center; gap: 6px; transition: background .15s;
}
.pifab-btn-primary:hover:not(:disabled) { background: ${t.btnPrimaryHov}; }
.pifab-btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.pifab-btn-secondary {
  padding: 8px 18px; border-radius: 7px;
  background: ${t.btnSecBg}; border: 1px solid ${t.btnSecBdr}; color: ${t.textPrimary};
  font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: background .15s;
}
.pifab-btn-secondary:hover { background: ${t.btnSecHov}; }

/* ── Spinner ── */
.pifab-spinner {
  display: inline-block; width: 12px; height: 12px;
  border: 2px solid rgba(255,255,255,0.25);
  border-top-color: #fff; border-radius: 50%;
  animation: pifab-spin .65s linear infinite;
}
@keyframes pifab-spin { to { transform: rotate(360deg); } }
`;
}

if (typeof window !== "undefined") {
  window.PeopleImportFAB = PeopleImportFAB;
}