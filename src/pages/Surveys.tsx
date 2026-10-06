import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { getSurveys, deleteSurvey } from '../api/surveys';
import type { Survey } from '../api/surveys';

const STATUS_OPTIONS = ['all', 'draft', 'finalized', 'submitted', 'approved', 'rejected'];

export default function Surveys() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchSurveys = () => {
    setLoading(true);
    getSurveys()
      .then((r) => setSurveys(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(fetchSurveys, []);

  const filtered = surveys.filter((s) => {
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchSearch =
      !search ||
      s.id.includes(search) ||
      s.project_id.includes(search) ||
      (s.project_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.assigned_to_name || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleExport = () => {
    const rows = filtered.map((s) => {
      let formData: Record<string, unknown> = {};
      try { formData = JSON.parse(s.form_response_json || '{}'); } catch {}
      return {
        'Survey No': s.survey_no ? `#${String(s.survey_no).padStart(3, '0')}` : s.id.slice(0, 8),
        'Survey ID': s.id,
        'Project': s.project_name || s.project_id,
        'User ID': s.user_id,
        'Status': s.status,
        'Geometry Type': s.geometry_type,
        'Assigned To': s.assigned_to_name || '',
        'Created': new Date(s.created_at).toLocaleString(),
        'Synced': s.synced_at ? new Date(s.synced_at).toLocaleString() : '',
        ...Object.fromEntries(
          Object.entries(formData)
            .filter(([k]) => !k.startsWith('_'))
            .map(([k, v]) => [`Field: ${k}`, String(v)])
        ),
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Surveys');
    XLSX.writeFile(wb, `dcroper_surveys_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this survey? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await deleteSurvey(id);
      setSurveys((prev) => prev.filter((s) => s.id !== id));
    } catch (e: any) {
      alert(e.response?.data?.error || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Surveys</h1>
        <p className="page-subtitle">{surveys.length} total surveys</p>
      </div>

      <div className="table-card">
        <div className="table-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <span className="table-title">All Surveys</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleExport}
              style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid #40916c',
                background: '#fff', color: '#40916c', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
              }}
            >
              ↓ Export XLSX
            </button>
            <div style={{ display: 'flex', gap: 6 }}>
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 20,
                    border: '1px solid #e0f0e6',
                    background: statusFilter === s ? '#40916c' : '#fff',
                    color: statusFilter === s ? '#fff' : '#374151',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <input
              className="search-bar"
              placeholder="Search by ID, project, assignee…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading surveys…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">No surveys match the filters</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Project</th>
                <th>Type</th>
                <th>Status</th>
                <th>Synced</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} onClick={() => navigate(`/surveys/${s.id}`)} style={{ cursor: 'pointer' }}>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1a3a2a', fontSize: 13 }}>
                      {s.survey_no ? `#${String(s.survey_no).padStart(3, '0')}` : '—'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.project_name || '—'}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#9ca3af' }}>{s.project_id.slice(0, 8)}…</div>
                  </td>
                  <td>{s.geometry_type}</td>
                  <td>
                    {s.status === 'approved' ? (
                      <span className="badge badge-synced">Approved</span>
                    ) : s.status === 'rejected' ? (
                      <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}>Rejected</span>
                    ) : s.synced_at ? (
                      <span className="badge badge-synced">Synced</span>
                    ) : s.status === 'finalized' ? (
                      <span className="badge badge-finalized">Finalized</span>
                    ) : (
                      <span className="badge badge-draft">Draft</span>
                    )}
                  </td>
                  <td>
                    {s.synced_at ? (
                      <span style={{ color: '#059669', fontSize: 13 }}>✓ {new Date(s.synced_at).toLocaleDateString()}</span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: 13 }}>—</span>
                    )}
                  </td>
                  <td>{new Date(s.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                      disabled={deleting === s.id}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc2626',
                        cursor: 'pointer',
                        fontSize: 16,
                        padding: '2px 4px',
                        opacity: deleting === s.id ? 0.5 : 1,
                      }}
                      title="Delete survey"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
