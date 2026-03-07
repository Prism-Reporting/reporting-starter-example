import { useMemo, useState } from "react";
import { ReportRenderer, defaultRegistry } from "@reporting/react-ui";
import {
  portfolioQuarterlyOverviewSpec,
  starterReports,
} from "./report-spec.js";

function createDataProvider() {
  return {
    async runQuery({ name, params = {} }) {
      const res = await fetch("/api/runQuery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, params }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      return res.json();
    },
  };
}

export default function App() {
  const dataProvider = useMemo(() => createDataProvider(), []);
  const [spec, setSpec] = useState(portfolioQuarterlyOverviewSpec);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async (event) => {
    event.preventDefault();
    if (!prompt.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/generateSpec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || res.statusText);
        return;
      }
      if (data.spec) setSpec(data.spec);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portfolio-app-shell">
      <header className="portfolio-app-header">
        <div className="portfolio-app-header-inner">
          <div>
            <h1 style={{ margin: 0, fontSize: 22 }}>Portfolio Reporting Example</h1>
            <p style={{ margin: "6px 0 0", color: "#475569" }}>
              Mocked quarterly portfolio data for an executive team reviewing delivery health, milestones, budget, and risk.
            </p>
          </div>

          <div className="portfolio-report-picker">
            {starterReports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => {
                  setSpec(report.spec);
                  setError(null);
                }}
                className="portfolio-report-button"
              >
                {report.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleGenerate} className="portfolio-prompt-form">
            <input
              type="text"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe the report, for example: show at-risk projects and milestones grouped by project for 2026-Q2"
              disabled={loading}
              className="portfolio-prompt-input"
            />
            <button type="submit" disabled={loading} className="portfolio-prompt-button">
              {loading ? "Generating..." : "Generate report"}
            </button>
          </form>

          {error ? (
            <p className="portfolio-error-text">{error}</p>
          ) : (
            <p className="portfolio-helper-text">
              Try prompts like "show projects at risk in 2026-Q2" or "milestones by project for Ava Patel".
            </p>
          )}
        </div>
      </header>

      <main className="portfolio-app-main">
        <ReportRenderer spec={spec} dataProvider={dataProvider} registry={defaultRegistry} />
      </main>
    </div>
  );
}
