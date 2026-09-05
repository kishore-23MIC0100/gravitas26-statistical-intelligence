"use client";
import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { analyze, Report, Row } from "@/lib/analytics";

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

function Bars({ items }: { items: { name: string; count: number }[] | null }) {
  if (!items || !items.length) return <Empty />;
  const max = Math.max(...items.map((x) => x.count), 1);
  return (
    <div className="bars">
      {items.map((x) => (
        <div className="bar" key={x.name}>
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

export default function Dashboard() {
  const [report, setReport] = useState<Report>(blank);
  const [name, setName] = useState("Loading dataset...");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploadError, setUploadError] = useState("");

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

  const upload = (f: File) => {
    setUploadError("");
    if (!f.name.toLowerCase().endsWith(".csv") || (f.type && f.type !== "text/csv")) {
      setUploadError("Only CSV files are accepted.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setUploadError("File size must be 10 MB or less.");
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
              <a href="#upload" onClick={closeMenu}>
                Data upload
              </a>
              <a href="#methodology" onClick={closeMenu}>
                Methodology
              </a>
              <a href="#evidence" onClick={closeMenu}>
                Evidence
              </a>
            </nav>
          )}
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
            Statistical dashboard calculating every figure directly from authorized source records across 180+ events.
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
          <a
            className="samplelink"
            href="/gravitas26-sample-testing-data.csv"
            download="gravitas26-sample-testing-data.csv"
          >
            Download sample testing CSV (187 Events)
          </a>
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

      <section className="grid">
        <article className="panel">
          <div className="panelhead">
            <div>
              <p>01 / PARTICIPATION MIX</p>
              <h3>Internal vs external</h3>
            </div>
          </div>
          <Bars
            items={
              report.internal.value !== null && report.external.value !== null
                ? [
                    { name: "Internal (VIT)", count: report.internal.value },
                    { name: "External", count: report.external.value },
                  ]
                : null
            }
          />
        </article>

        <article className="panel feature">
          <p>04 / HIGHEST REGISTRATIONS</p>
          {top ? (
            <>
              <h3>{top.name}</h3>
              <strong>
                {n(top.count)} <small>registrations</small>
              </strong>
              <span>{top.category}</span>
            </>
          ) : (
            <>
              <h3>Highest registration</h3>
              <Empty note={report.ranking.note} />
            </>
          )}
        </article>

        <article className="panel wide">
          <div className="panelhead">
            <div>
              <p>02 / EXTERNAL COLLEGES</p>
              <h3>Institutions represented</h3>
            </div>
            <div className="searcharea">
              <label className="searchbox">
                <span className="searchicon" aria-hidden="true" />
                <input
                  aria-label="Search external colleges"
                  placeholder="Search college"
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

        <article className="panel">
          <p>03 / EVENT CATEGORIES</p>
          <h3>Unique events by category</h3>
          <Bars items={report.categories.value} />
        </article>

        <article className="panel">
          <p>07 / GENDER DISTRIBUTION</p>
          <h3>Declared values</h3>
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

        <article className="panel wide">
          <p>05 / RANKED EVENTS</p>
          <h3>Registration ranking (Top 12)</h3>
          {report.ranking.value ? (
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
                {report.ranking.value.slice(0, 12).map((x, i) => (
                  <tr key={x.name}>
                    <td>{String(i + 1).padStart(2, "0")}</td>
                    <td>{x.name}</td>
                    <td>{x.category}</td>
                    <td>{n(x.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty note={report.ranking.note} />
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
