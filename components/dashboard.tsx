"use client";
import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import {
  analyze,
  Report,
  Row,
  CategoryAnalyticsItem,
  PaymentBreakdownItem,
  CountryBreakdownItem,
} from "@/lib/analytics";

const blank = analyze([], []);
const n = (x: number | null) =>
  x === null ? "—" : new Intl.NumberFormat("en-IN").format(x);

function Empty({ note }: { note?: string }) {
  return <p className="empty">{note || "No data available for this metric."}</p>;
}

function Card({
  label,
  value,
  note,
}: {
  label: string;
  value: number | null;
  note?: string;
}) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{n(value)}</strong>
      {value === null && <small>{note || "No data available"}</small>}
    </article>
  );
}

function Bars({
  items,
  activeItem,
  onSelect,
}: {
  items: { name: string; count: number }[] | null;
  activeItem?: string;
  onSelect?: (name: string) => void;
}) {
  if (!items || !items.length) return <Empty />;
  const max = Math.max(...items.map((x) => x.count), 1);
  return (
    <div className="bars">
      {items.map((x) => (
        <div
          className={`bar ${activeItem === x.name ? "active-bar" : ""}`}
          key={x.name}
          onClick={() => onSelect && onSelect(x.name)}
          style={{ cursor: onSelect ? "pointer" : "default" }}
        >
          <div>
            <span>{x.name}</span>
            <b>{n(x.count)}</b>
          </div>
          <i style={{ width: `${Math.max(4, (x.count / max) * 100)}%` }} />
        </div>
      ))}
    </div>
  );
}

/* Donut Chart Component */
function DonutChart({
  data,
  totalLabel,
}: {
  data: { label: string; value: number; color: string }[];
  totalLabel?: string;
}) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  if (total === 0) return <Empty />;

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div className="donut-wrap">
      <div className="donut-chart">
        <svg viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="var(--line)"
            strokeWidth="16"
          />
          {data.map((item) => {
            const percent = item.value / total;
            const strokeDasharray = `${percent * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedPercent * circumference;
            accumulatedPercent += percent;
            return (
              <circle
                key={item.label}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="16"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: "stroke-dasharray 0.5s ease" }}
              />
            );
          })}
        </svg>
        <div className="donut-center">
          <strong>{n(total)}</strong>
          <small>{totalLabel || "Total"}</small>
        </div>
      </div>
      <div className="donut-legend">
        {data.map((item) => {
          const pct = total ? ((item.value / total) * 100).toFixed(1) : "0";
          return (
            <div key={item.label} className="legend-item">
              <span>
                <i
                  className="legend-dot"
                  style={{ background: item.color }}
                />
                {item.label}
              </span>
              <b>
                {n(item.value)} <small>({pct}%)</small>
              </b>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type ThemeMode = "system" | "light" | "dark" | "obsidian" | "royal";

export default function Dashboard() {
  const [report, setReport] = useState<Report>(blank);
  const [name, setName] = useState("Loading dataset...");
  const [query, setQuery] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [theme, setTheme] = useState<ThemeMode>("system");

  // Dynamic Theme Management
  useEffect(() => {
    const savedTheme = (localStorage.getItem("gravitas_theme") as ThemeMode) || "system";
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
    localStorage.setItem("gravitas_theme", theme);
  }, [theme]);

  const loadSampleData = () => {
    setUploadError("");
    fetch("/gravitas26-sample-testing-data.csv")
      .then((res) => res.text())
      .then((text) => {
        Papa.parse<Row>(text, {
          header: true,
          skipEmptyLines: true,
          complete: (r) => {
            if (r.errors.length) {
              setUploadError("Could not load sample dataset.");
              return;
            }
            const rows = r.data.filter((x) =>
              Object.values(x).some((v) => String(v).trim())
            );
            setReport(analyze(rows, r.meta.fields || []));
            setName("gravitas26-sample-testing-data.csv (Official Sample Dataset)");
          },
        });
      })
      .catch(() => {
        setUploadError("Failed to fetch sample dataset.");
      });
  };

  useEffect(() => {
    loadSampleData();
  }, []);

  const external = useMemo(
    () =>
      report.externalColleges.value?.filter((x) =>
        x.name.toLowerCase().includes(query.toLowerCase())
      ) ?? null,
    [report, query]
  );

  const filteredEvents = useMemo(() => {
    if (!report.ranking.value) return null;
    let list = report.ranking.value;
    if (selectedCategory !== "All") {
      list = list.filter((x) => x.category === selectedCategory);
    }
    if (eventSearch.trim()) {
      const q = eventSearch.toLowerCase();
      list = list.filter(
        (x) =>
          x.name.toLowerCase().includes(q) ||
          x.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [report.ranking.value, selectedCategory, eventSearch]);

  const upload = (f: File) => {
    setUploadError("");
    if (!f.name.toLowerCase().endsWith(".csv") || (f.type && f.type !== "text/csv")) {
      setUploadError("Only CSV files are accepted.");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      setUploadError("File size must be 15 MB or less.");
      return;
    }
    Papa.parse<Row>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (r) => {
        if (r.errors.length) {
          setUploadError("The CSV could not be read. Please check its format.");
          return;
        }
        const rows = r.data.filter((x) =>
          Object.values(x).some((v) => String(v).trim())
        );
        setReport(analyze(rows, r.meta.fields || []));
        setName(f.name);
      },
    });
  };

  const top = report.ranking.value?.[0];
  const closeMenu = () => setMenuOpen(false);
  const motto = (
    <>
      DRIVEN BY INNOVATION <i /> ANCHORED IN SUSTAINABILITY <i />
    </>
  );

  const categoryList = useMemo(() => {
    if (!report.categoryAnalytics.value) return [];
    return ["All", ...report.categoryAnalytics.value.map((c) => c.name)];
  }, [report.categoryAnalytics.value]);

  // Dynamic Theme Colors for Donut
  const donutColors = useMemo(() => {
    switch (theme) {
      case "obsidian":
        return { internal: "#00d2ff", external: "#80e5ff" };
      case "royal":
        return { internal: "#1a237e", external: "#3d5afe" };
      case "dark":
        return { internal: "#102a19", external: "#61c57a" };
      case "light":
      default:
        return { internal: "#173b24", external: "#41ab5d" };
    }
  }, [theme]);

  return (
    <main>
      <div
        className="ticker"
        aria-label="Driven by innovation, anchored in sustainability"
      >
        <div className="tickertrack">
          <span>{motto}</span>
          <span aria-hidden="true">{motto}</span>
          <span aria-hidden="true">{motto}</span>
          <span aria-hidden="true">{motto}</span>
        </div>
      </div>

      <header className="top">
        <div className="vitmark">
          <img
            src="/assets/vitLogo.0968a7ac.svg"
            alt="Vellore Institute of Technology"
          />
        </div>
        <div className="eventmark">
          <img
            src="/assets/gravitasLogo.dc8211c7.svg"
            alt="graVITas’26"
          />
        </div>
        <div className="header-actions">
          {/* Dynamic Theme Switcher Toolbar */}
          <div className="theme-toggle" role="radiogroup" aria-label="Theme selector">
            <button
              type="button"
              className={`theme-btn ${theme === "system" ? "active" : ""}`}
              onClick={() => setTheme("system")}
              title="Adaptive Auto (System theme)"
              aria-label="System Theme"
            >
              🌓
            </button>
            <button
              type="button"
              className={`theme-btn ${theme === "light" ? "active" : ""}`}
              onClick={() => setTheme("light")}
              title="Emerald Light Theme"
              aria-label="Light Theme"
            >
              ☀️
            </button>
            <button
              type="button"
              className={`theme-btn ${theme === "dark" ? "active" : ""}`}
              onClick={() => setTheme("dark")}
              title="Emerald Dark Theme"
              aria-label="Dark Theme"
            >
              🌙
            </button>
            <button
              type="button"
              className={`theme-btn ${theme === "obsidian" ? "active" : ""}`}
              onClick={() => setTheme("obsidian")}
              title="Cyber Obsidian Theme"
              aria-label="Cyber Obsidian Theme"
            >
              🌌
            </button>
            <button
              type="button"
              className={`theme-btn ${theme === "royal" ? "active" : ""}`}
              onClick={() => setTheme("royal")}
              title="VIT Royal Navy Theme"
              aria-label="Royal Navy Theme"
            >
              ⚡
            </button>
          </div>

          <div className="menuwrap">
            <button
              className="menubutton"
              type="button"
              aria-label="Open dashboard navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <i />
              <i />
              <i />
            </button>
            {menuOpen && (
              <nav aria-label="Dashboard navigation">
                <a href="#overview" onClick={closeMenu}>
                  Dashboard
                </a>
                <a href="#analytics" onClick={closeMenu}>
                  Visual Analytics
                </a>
                <a href="#events" onClick={closeMenu}>
                  Event Directory
                </a>
                <a href="#methodology" onClick={closeMenu}>
                  Data Health
                </a>
              </nav>
            )}
          </div>
        </div>
      </header>

      <div className="titlebar">
        <p>PRESS INTERVIEW · AUTHORIZED VIEW</p>
        <h1>Statistical Intelligence</h1>
      </div>

      <section className="intro" id="overview">
        <div>
          <p className="eyebrow">GraVITas’26 media briefing</p>
          <h2>
            Evidence-first answers,
            <br />
            ready for the room.
          </h2>
          <p>
            Interactive statistical intelligence dashboard computing metrics directly from authorized event records across 180+ events.
          </p>
        </div>
        <div className="uploadgroup">
          <label className="upload" id="upload">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            <span>Upload Custom CSV</span>
            <small>{name}</small>
          </label>
          <button
            type="button"
            className="samplebtn"
            onClick={loadSampleData}
          >
            ⚡ Load Official Sample Dataset
          </button>
          {uploadError && (
            <small className="uploaderror" role="alert">
              {uploadError}
            </small>
          )}
        </div>
      </section>

      <section className="meta" id="methodology">
        <span>
          <b>Data status:</b> {report.rows ? "Loaded" : "Awaiting dataset"}
        </span>
        <span>
          <b>Quality:</b> {report.quality.status}
        </span>
        <span>
          <b>Source:</b> {name}
        </span>
        <span>
          <b>Rows analyzed:</b> {n(report.rows)}
        </span>
        <span>
          <b>Duplicates flagged:</b> {report.quality.duplicates}
        </span>
        <span>
          <b>Missing mapped fields:</b> {report.quality.missing}
        </span>
      </section>

      {/* Primary KPI Metrics */}
      <section className="metrics">
        <Card
          label="Internal count"
          value={report.internal.value}
          note={report.internal.note}
        />
        <Card
          label="External count"
          value={report.external.value}
          note={report.external.note}
        />
        <Card
          label="Total paid"
          value={report.paid.value}
          note={report.paid.note}
        />
        <Card
          label="International events"
          value={report.internationalEvents.value}
          note={report.internationalEvents.note}
        />
        <Card
          label="International participants"
          value={report.internationalParticipants.value}
          note={report.internationalParticipants.note}
        />
        <Card
          label="External colleges"
          value={report.externalColleges.value?.length ?? null}
          note={report.externalColleges.note}
        />
      </section>

      {/* Visual Analytics Grid */}
      <section className="grid" id="analytics">
        {/* Visual 1: Participation Donut Chart */}
        <article className="panel">
          <div className="panelhead">
            <div>
              <p>01 / PARTICIPATION RADIAL</p>
              <h3>Internal vs External Mix</h3>
            </div>
          </div>
          {report.internal.value !== null && report.external.value !== null ? (
            <DonutChart
              data={[
                {
                  label: "Internal (VIT)",
                  value: report.internal.value,
                  color: donutColors.internal,
                },
                {
                  label: "External Institutions",
                  value: report.external.value,
                  color: donutColors.external,
                },
              ]}
              totalLabel="Registrations"
            />
          ) : (
            <Empty note={report.internal.note} />
          )}
        </article>

        {/* Visual 2: Highest Registrations Spotlight */}
        <article className="panel feature">
          <p>04 / HIGHEST REGISTRATIONS</p>
          {top ? (
            <>
              <h3>{top.name}</h3>
              <strong>
                {n(top.count)} <small>registrations</small>
              </strong>
              <span>
                <span className="badge">{top.category}</span>
              </span>
            </>
          ) : (
            <>
              <h3>Highest registration</h3>
              <Empty note={report.ranking.note} />
            </>
          )}
        </article>

        {/* Visual 3: Payment Conversion & Revenue Waterfall */}
        <article className="panel wide">
          <div className="panelhead">
            <div>
              <p>06 / PAYMENT SETTLEMENT & CONVERSION</p>
              <h3>Registration Payment Health</h3>
            </div>
          </div>
          {report.paymentBreakdown.value ? (
            <div>
              <div className="progress-meter">
                {report.paymentBreakdown.value.map((p) => (
                  <div
                    key={p.name}
                    className={`meter-fill fill-${p.statusType}`}
                    style={{ width: `${p.percent}%` }}
                    title={`${p.name}: ${p.percent}% (${p.count})`}
                  />
                ))}
              </div>
              <div className="status-grid">
                {report.paymentBreakdown.value.map((p) => (
                  <div key={p.name} className="status-card">
                    <small>{p.name}</small>
                    <b>{n(p.count)}</b>
                    <small>{p.percent}%</small>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty note={report.paymentBreakdown.note} />
          )}
        </article>

        {/* Visual 4: Institutional Reach Search & Table */}
        <article className="panel wide">
          <div className="panelhead">
            <div>
              <p>02 / EXTERNAL INSTITUTIONS</p>
              <h3>External Colleges Represented</h3>
            </div>
            <div className="searcharea">
              <label className="searchbox">
                <span className="searchicon" aria-hidden="true" />
                <input
                  aria-label="Search external colleges"
                  placeholder="Search college name"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              {external && (
                <small>
                  {external.length} result{external.length === 1 ? "" : "s"}
                </small>
              )}
            </div>
          </div>
          {external ? (
            <table>
              <thead>
                <tr>
                  <th>College name</th>
                  <th>Registrations</th>
                </tr>
              </thead>
              <tbody>
                {external.slice(0, 10).map((x) => (
                  <tr key={x.name}>
                    <td>{x.name}</td>
                    <td>{n(x.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty note={report.externalColleges.note} />
          )}
        </article>

        {/* Visual 5: Event Category Analytics Grid */}
        <article className="panel wide">
          <div className="panelhead">
            <div>
              <p>03 / CATEGORY DISTRIBUTION MATRIX</p>
              <h3>Event Clusters & Volume</h3>
            </div>
          </div>
          {report.categoryAnalytics.value ? (
            <div className="cat-matrix">
              {report.categoryAnalytics.value.map((c) => (
                <div
                  key={c.name}
                  className={`cat-card ${selectedCategory === c.name ? "active-card" : ""}`}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === c.name ? "All" : c.name
                    )
                  }
                >
                  <div className="cat-card-head">
                    <span>{c.name}</span>
                    <span className="cat-card-badge">{c.eventsCount} Events</span>
                  </div>
                  <div className="cat-card-bar">
                    <div
                      className="cat-card-fill"
                      style={{ width: `${c.share}%` }}
                    />
                  </div>
                  <div className="cat-card-stats">
                    <span>{n(c.registrations)} registrations</span>
                    <b>{c.share}%</b>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty note={report.categories.note} />
          )}
        </article>

        {/* Visual 6: Gender Diversity Breakdown */}
        <article className="panel">
          <p>07 / GENDER DIVERSITY</p>
          <h3>Declared Demographic Values</h3>
          {report.genders.value ? (
            <table>
              <thead>
                <tr>
                  <th>Value</th>
                  <th>Count</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {report.genders.value.map((x) => (
                  <tr key={x.name}>
                    <td>{x.name}</td>
                    <td>{n(x.count)}</td>
                    <td>{x.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty note={report.genders.note} />
          )}
        </article>

        {/* Visual 7: Geographic & Country Reach */}
        <article className="panel">
          <p>08 / GLOBAL FOOTPRINT</p>
          <h3>International & Regional Footprint</h3>
          {report.countryBreakdown.value ? (
            <table>
              <thead>
                <tr>
                  <th>Country / Territory</th>
                  <th>Participants</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {report.countryBreakdown.value.slice(0, 6).map((x) => (
                  <tr key={x.name}>
                    <td>{x.name}</td>
                    <td>{n(x.count)}</td>
                    <td>{x.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty note={report.countryBreakdown.note} />
          )}
        </article>

        {/* Visual 8: Interactive Ranked Event Directory */}
        <article className="panel wide" id="events">
          <div className="panelhead">
            <div>
              <p>05 / EVENT LEADERBOARD & DIRECTORY</p>
              <h3>Registration Ranking ({filteredEvents ? filteredEvents.length : 0} Events)</h3>
            </div>
            <div className="searcharea">
              <label className="searchbox">
                <span className="searchicon" aria-hidden="true" />
                <input
                  aria-label="Search events"
                  placeholder="Filter by event name"
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                />
              </label>
            </div>
          </div>

          {/* Category Chips Filter */}
          <div className="chip-group">
            {categoryList.map((catName) => (
              <button
                key={catName}
                type="button"
                className={`chip ${selectedCategory === catName ? "active" : ""}`}
                onClick={() => setSelectedCategory(catName)}
              >
                {catName}
              </button>
            ))}
          </div>

          {filteredEvents && filteredEvents.length > 0 ? (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Event</th>
                    <th>Category</th>
                    <th>Registrations</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAllEvents
                    ? filteredEvents
                    : filteredEvents.slice(0, 12)
                  ).map((x, i) => (
                    <tr key={x.name}>
                      <td>{String(i + 1).padStart(2, "0")}</td>
                      <td>{x.name}</td>
                      <td>
                        <span className="badge">{x.category}</span>
                      </td>
                      <td>{n(x.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredEvents.length > 12 && (
                <button
                  type="button"
                  className="expand-btn"
                  onClick={() => setShowAllEvents(!showAllEvents)}
                >
                  {showAllEvents
                    ? "▲ Show Top 12 Events Only"
                    : `▼ View All ${filteredEvents.length} Events in this category`}
                </button>
              )}
            </>
          ) : (
            <Empty note="No events matched the current search or category filter." />
          )}
        </article>
      </section>

      <footer id="evidence">
        <div>
          <b>GraVITas’26 Press Interview</b>
          <span>Statistical Intelligence Dashboard</span>
        </div>
        <div>
          <b>Briefing ready</b>
          <span>Data-led insights for authorized media preparation</span>
        </div>
        <div>
          <b>Confidential view</b>
          <span>For authorized event officials and spokespersons</span>
        </div>
      </footer>
    </main>
  );
}
