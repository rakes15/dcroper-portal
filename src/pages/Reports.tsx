import { useEffect, useState } from 'react';
import { getSurveys, exportSurveys } from '../api/surveys';
import type { Survey } from '../api/surveys';
import { getProjects } from '../api/projects';
import type { Project } from '../api/projects';

const ALL_STATUSES = ['draft', 'pending', 'submitted', 'finalized', 'approved', 'rejected'];

const STATUS_COLOR: Record<string, string> = {
  approved:  '#10b981',
  submitted: '#f59e0b',
  pending:   '#f59e0b',
  finalized: '#6366f1',
  rejected:  '#ef4444',
  draft:     '#9ca3af',
};

export default function Reports() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Export state
  const [exporting, setExporting] = useState<'csv' | 'geojson' | null>(null);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    Promise.all([getSurveys(), getProjects()])
      .then(([s, p]) => { setSurveys(s.data); setProjects(p.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Client-side preview (matches what backend will export) ────
  const preview = surveys.filter((s) => {
    if (projectId && s.project_id !== projectId) return false;
    if (status   && s.status !== status)          return false;
    if (fromDate && s.created_at < fromDate)       return false;
    if (toDate   && s.created_at.slice(0, 10) > toDate) return false;
    return true;
  });

  // ── Summary stats for printable report ───────────────────────
  const byProject: Record<string, { name: string; total: number; approved: number; rejected: number; pending: number; draft: number }> = {};
  for (const s of preview) {
    const p = projects.find((p) => p.id === s.project_id);
    if (!byProject[s.project_id])
      byProject[s.project_id] = { name: p?.name || s.project_id.slice(0, 8), total: 0, approved: 0, rejected: 0, pending: 0, draft: 0 };
    byProject[s.project_id].total++;
    if (s.status === 'approved')                                  byProject[s.project_id].approved++;
    else if (s.status === 'rejected')                             byProject[s.project_id].rejected++;
    else if (s.status === 'submitted' || s.status === 'pending') byProject[s.project_id].pending++;
    else if (s.status === 'draft')                                byProject[s.project_id].draft++;
  }
  const projectRows = Object.values(byProject).sort((a, b) => b.total - a.total);

  const byStatus: Record<string, number> = {};
  for (const s of preview) byStatus[s.status] = (byStatus[s.status] || 0) + 1;

  const approved = preview.filter((s) => s.status === 'approved').length;
  const rejected = preview.filter((s) => s.status === 'rejected').length;
  const reviewed = approved + rejected;

  // ── Export handler ────────────────────────────────────────────
  const handleExport = async (fmt: 'csv' | 'geojson') => {
    setExporting(fmt);
    setExportError('');
    try {
      const res = await exportSurveys(fmt, {
        ...(projectId ? { project_id: projectId } : {}),
        ...(status    ? { status }                : {}),
        ...(fromDate  ? { from: fromDate }         : {}),
        ...(toDate    ? { to: toDate }             : {}),
      });
      const ext = fmt === 'csv' ? 'csv' : 'geojson';
      const mime = fmt === 'csv' ? 'text/csv' : 'application/geo+json';
      const blob = new Blob([res.data as BlobPart], { type: mime });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `surveys_${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError('Export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const handlePrint = () => window.print();

  if (loading) return <div className="loading" style={{ padding: 40 }}>Loading…</div>;

  return (
    <>
      {/* ── Print stylesheet (hidden on screen) ── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { font-size: 12px; }
          .table-card { box-shadow: none !important; border: 1px solid #ccc !important; }
        }
        .print-only { display: none; }
      `}</style>

      <div>
        {/* ── Header ── */}
        <div className="page-header no-print">
          <h1 className="page-title">Reports &amp; Exports</h1>
          <p className="page-subtitle">Filter surveys and download data or print a summary report</p>
        </div>

        {/* ── Print header (visible only when printing) ── */}
        <div className="print-only" style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>dCroPER — Survey Report</h1>
          <p style={{ color: '#6b7280', fontSize: 13 }}>
            Generated {new Date().toLocaleString()}
            {projectId ? ` · Project: ${projects.find((p) => p.id === projectId)?.name}` : ''}
            {status    ? ` · Status: ${status}` : ''}
            {fromDate  ? ` · From: ${fromDate}` : ''}
            {toDate    ? ` · To: ${toDate}` : ''}
          </p>
        </div>

        {/* ── Filters ── */}
        <div className="table-card no-print" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 14, color: '#1a3a2a', fontSize: 14 }}>Filters</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <label style={labelStyle}>Project</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={selectStyle}>
                <option value="">All Projects</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle}>
                <option value="">All Statuses</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>From Date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={selectStyle} />
            </div>
            <div>
              <label style={labelStyle}>To Date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={selectStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 13, color: '#374151' }}>
              <strong style={{ color: '#40916c', fontSize: 16 }}>{preview.length}</strong>{' '}
              survey{preview.length !== 1 ? 's' : ''} match{preview.length === 1 ? 'es' : ''} your filters
              {preview.length > 0 && (
                <span style={{ color: '#9ca3af' }}>
                  {' '}· {approved} approved · {rejected} rejected
                  {reviewed > 0 ? ` · ${Math.round((approved / reviewed) * 100)}% approval rate` : ''}
                </span>
              )}
            </div>
            <button
              onClick={() => { setProjectId(''); setStatus(''); setFromDate(''); setToDate(''); }}
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 12 }}
            >
              Clear filters
            </button>
          </div>
        </div>

        {/* ── Export cards ── */}
        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
          <ExportCard
            icon="📄"
            title="CSV Spreadsheet"
            description="One row per survey with all form fields as columns. Open in Excel, Google Sheets, or any GIS tool."
            badge="CSV"
            badgeColor="#10b981"
            disabled={preview.length === 0 || exporting !== null}
            loading={exporting === 'csv'}
            onClick={() => handleExport('csv')}
          />
          <ExportCard
            icon="🗺️"
            title="GeoJSON"
            description="Survey geometries as a GeoJSON FeatureCollection. Import directly into QGIS, ArcGIS, or Mapbox."
            badge="GeoJSON"
            badgeColor="#3b82f6"
            disabled={preview.length === 0 || exporting !== null}
            loading={exporting === 'geojson'}
            onClick={() => handleExport('geojson')}
          />
          <ExportCard
            icon="🖨️"
            title="Print Summary"
            description="Print-friendly project breakdown table with approval stats. Save as PDF from your browser."
            badge="PDF / Print"
            badgeColor="#8b5cf6"
            disabled={preview.length === 0}
            loading={false}
            onClick={handlePrint}
          />
        </div>

        {exportError && (
          <div className="no-print" style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {exportError}
          </div>
        )}

        {/* ── Summary stats ── */}
        {preview.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
              {Object.entries(byStatus).sort((a, b) => b[1] - a[1]).map(([s, c]) => (
                <div key={s} className="stat-card">
                  <div className="stat-label" style={{ textTransform: 'capitalize' }}>{s}</div>
                  <div className="stat-value" style={{ color: STATUS_COLOR[s] || '#374151' }}>{c}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                    {Math.round((c / preview.length) * 100)}% of total
                  </div>
                </div>
              ))}
            </div>

            {/* ── Project breakdown table ── */}
            <div className="table-card">
              <div className="table-header no-print">
                <span className="table-title">Project Breakdown</span>
              </div>
              <div className="print-only" style={{ fontWeight: 700, fontSize: 15, padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
                Project Breakdown
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th style={{ width: 72 }}>Total</th>
                    <th style={{ width: 84 }}>Approved</th>
                    <th style={{ width: 72 }}>Rejected</th>
                    <th style={{ width: 80 }}>Pending</th>
                    <th style={{ width: 56 }}>Draft</th>
                    <th style={{ width: 100 }}>Approval %</th>
                  </tr>
                </thead>
                <tbody>
                  {projectRows.map((p) => {
                    const rev = p.approved + p.rejected;
                    const rate = rev > 0 ? Math.round((p.approved / rev) * 100) : null;
                    return (
                      <tr key={p.name}>
                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.total}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', color: '#059669' }}>{p.approved || '—'}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', color: p.rejected > 0 ? '#dc2626' : '#9ca3af' }}>{p.rejected || '—'}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', color: p.pending > 0 ? '#d97706' : '#9ca3af' }}>{p.pending || '—'}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', color: '#9ca3af' }}>{p.draft || '—'}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {rate !== null ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ flex: 1, height: 5, background: '#e0f0e6', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${rate}%`, background: rate >= 80 ? '#10b981' : '#f59e0b', borderRadius: 99 }} />
                              </div>
                              <span style={{ fontSize: 11, color: '#6b7280', minWidth: 28 }}>{rate}%</span>
                            </div>
                          ) : <span style={{ color: '#9ca3af' }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 700, borderTop: '2px solid #e0f0e6' }}>
                    <td>Total</td>
                    <td>{preview.length}</td>
                    <td style={{ color: '#059669' }}>{approved || '—'}</td>
                    <td style={{ color: rejected > 0 ? '#dc2626' : '#9ca3af' }}>{rejected || '—'}</td>
                    <td style={{ color: '#9ca3af' }}>—</td>
                    <td style={{ color: '#9ca3af' }}>—</td>
                    <td style={{ fontSize: 12 }}>
                      {reviewed > 0 ? `${Math.round((approved / reviewed) * 100)}%` : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}

        {preview.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>No surveys match your filters</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Adjust the filters above to see data</div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Export card ────────────────────────────────────────────────────────────────

function ExportCard({
  icon, title, description, badge, badgeColor, disabled, loading, onClick,
}: {
  icon: string; title: string; description: string;
  badge: string; badgeColor: string;
  disabled: boolean; loading: boolean; onClick: () => void;
}) {
  return (
    <div className="table-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 28 }}>{icon}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
          background: `${badgeColor}18`, color: badgeColor, letterSpacing: '0.05em',
        }}>{badge}</span>
      </div>
      <div>
        <div style={{ fontWeight: 600, color: '#1a3a2a', fontSize: 14, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{description}</div>
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          marginTop: 'auto', padding: '9px 16px', borderRadius: 8, border: 'none',
          background: disabled ? '#f3f4f6' : badgeColor,
          color: disabled ? '#9ca3af' : '#fff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 13, fontWeight: 600,
          transition: 'background 0.15s',
        }}
      >
        {loading ? 'Exporting…' : `Download ${badge}`}
      </button>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, color: '#6b7280', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5,
};
const selectStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid #e0f0e6', fontSize: 13, background: '#fff', color: '#1a3a2a',
};
