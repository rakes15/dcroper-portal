import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getProjects, createProject, updateProject, archiveProject } from '../api/projects';
import type { Project, ProjectInput } from '../api/projects';
import { getSurveys } from '../api/surveys';
import type { Survey } from '../api/surveys';
import { useAuth } from '../context/AuthContext';

const GEOMETRY_TYPES = ['point', 'polygon', 'line'];

const emptyForm = (): ProjectInput => ({
  name: '', description: '', geometry_type: 'point', accuracy_threshold: 10, max_images: 5,
});

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canEdit = user?.role === 'admin' || user?.role === 'supervisor';
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchProjects = () => {
    setLoading(true);
    getProjects(showArchived)
      .then((r) => setProjects(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(fetchProjects, [showArchived]);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setForm(emptyForm());
    setFormError('');
    setEditing(null);
    setModal('create');
  };

  const openEdit = (p: Project) => {
    let config: any = {};
    try { config = JSON.parse(p.config_json || '{}'); } catch {}
    setForm({
      name: p.name,
      description: p.description || '',
      geometry_type: config.geometry_type || 'point',
      accuracy_threshold: config.accuracy_threshold || 10,
      max_images: config.max_images || 5,
    });
    setFormError('');
    setEditing(p);
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Project name is required'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (modal === 'create') {
        await createProject(form);
      } else if (editing) {
        await updateProject(editing.id, form);
      }
      setModal(null);
      fetchProjects();
    } catch (e: any) {
      setFormError(e.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (p: Project) => {
    if (!confirm(`Archive "${p.name}"? It will be hidden from the app.`)) return;
    try {
      await archiveProject(p.id);
      fetchProjects();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Archive failed');
    }
  };

  const handleDownloadPdf = async (p: Project) => {
    let surveys: Survey[] = [];
    try {
      const r = await getSurveys({ project_id: p.id });
      surveys = r.data;
    } catch {}

    const doc = new jsPDF();
    const green: [number, number, number] = [26, 58, 42];

    // Header
    doc.setFillColor(...green);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('dCroPER Survey Report', 14, 12);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(p.name, 14, 21);

    // Meta
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);
    doc.text(`Project ID: ${p.id}`, 14, 43);
    if (p.description) doc.text(`Description: ${p.description}`, 14, 50);

    // Stats summary
    const byStatus: Record<string, number> = {};
    for (const s of surveys) {
      byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    }
    const statsY = p.description ? 58 : 52;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, statsY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total surveys: ${surveys.length}`, 14, statsY + 7);
    let col = 0;
    for (const [status, count] of Object.entries(byStatus)) {
      doc.text(`${status}: ${count}`, 14 + col * 55, statsY + 14);
      col++;
    }

    // Survey table
    const tableStart = statsY + 24;
    const rows = surveys.map((s) => [
      s.id.slice(0, 12) + '…',
      s.geometry_type,
      s.status,
      s.assigned_to_name || '—',
      new Date(s.created_at).toLocaleDateString(),
    ]);

    autoTable(doc, {
      startY: tableStart,
      head: [['Survey ID', 'Type', 'Status', 'Assigned', 'Created']],
      body: rows,
      headStyles: { fillColor: green, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [240, 250, 242] },
      margin: { left: 14, right: 14 },
    });

    doc.save(`${p.name.replace(/\s+/g, '_')}_report.pdf`);
  };

  return (
    <div>
      {/* Modal */}
      {modal && (
        <div
          onClick={() => setModal(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 12, padding: 28,
              width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <h2 style={{ margin: '0 0 20px', fontSize: 18, color: '#1a3a2a' }}>
              {modal === 'create' ? 'New Project' : 'Edit Project'}
            </h2>

            {formError && (
              <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 13 }}>
                {formError}
              </div>
            )}

            <label style={labelStyle}>Project Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Kharif Survey 2025"
              style={inputStyle}
              autoFocus
            />

            <label style={labelStyle}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional project description"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Geometry</label>
                <select value={form.geometry_type} onChange={(e) => setForm({ ...form, geometry_type: e.target.value })} style={inputStyle}>
                  {GEOMETRY_TYPES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Accuracy (m)</label>
                <input type="number" value={form.accuracy_threshold} onChange={(e) => setForm({ ...form, accuracy_threshold: Number(e.target.value) })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Max Photos</label>
                <input type="number" value={form.max_images} onChange={(e) => setForm({ ...form, max_images: Number(e.target.value) })} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={saveBtnStyle}>
                {saving ? 'Saving…' : modal === 'create' ? 'Create Project' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        <p className="page-subtitle">{projects.filter((p) => p.status === 'active').length} active projects</p>
      </div>

      <div className="table-card">
        <div className="table-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <span className="table-title">All Projects</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
              Show archived
            </label>
            <input
              className="search-bar"
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {canEdit && (
              <button
                onClick={openCreate}
                style={{
                  padding: '7px 16px', borderRadius: 8, border: 'none',
                  background: '#40916c', color: '#fff', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                }}
              >
                + New Project
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading projects…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">No projects found</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Geometry</th>
                <th>Surveys</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                let config: any = {};
                try { config = JSON.parse(p.config_json || '{}'); } catch {}
                return (
                  <tr key={p.id} style={{ opacity: p.status === 'archived' ? 0.55 : 1 }}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.description || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                        {config.geometry_type === 'polygon' ? '⬡' : '📍'} {config.geometry_type || '—'}
                      </span>
                    </td>
                    <td>{p.survey_count ?? '—'}</td>
                    <td>
                      {p.status === 'active'
                        ? <span className="badge badge-synced">Active</span>
                        : <span className="badge badge-draft">Archived</span>}
                    </td>
                    <td>{new Date(p.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => navigate(`/projects/${p.id}/analytics`)} title="View analytics" style={iconBtnStyle}>📊</button>
                        <button onClick={() => handleDownloadPdf(p)} title="Download PDF report" style={iconBtnStyle}>📄</button>
                        {canEdit && <button onClick={() => openEdit(p)} title="Edit project" style={iconBtnStyle}>✏️</button>}
                        {isAdmin && p.status === 'active' && (
                          <button onClick={() => handleArchive(p)} title="Archive project" style={{ ...iconBtnStyle, color: '#dc2626' }}>🗄</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4, marginTop: 14,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid #e0f0e6', fontSize: 14, boxSizing: 'border-box',
};
const saveBtnStyle: React.CSSProperties = {
  padding: '9px 20px', background: '#40916c', color: '#fff',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
};
const cancelBtnStyle: React.CSSProperties = {
  padding: '9px 16px', background: '#f3f4f6', color: '#374151',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
};
const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 4px',
};
