import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getProjects, createProject, updateProject, setProjectStatus, STATUS_META, TRANSITIONS, getProjectAssignments, assignUserToProject, unassignUserFromProject } from '../api/projects';
import type { Project, ProjectInput, ProjectStatus, ProjectAssignment } from '../api/projects';
import { getSurveys } from '../api/surveys';
import type { Survey } from '../api/surveys';
import { getUsers } from '../api/users';
import type { User } from '../api/users';
import { getAllMasters } from '../api/masters';
import type { MasterState, MasterDistrict, MasterSeason, MasterCrop } from '../api/masters';
import { useAuth } from '../context/AuthContext';

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
  { value: 'cancelled', label: 'Cancelled' },
];

const GEOMETRY_TYPES = ['point', 'polygon', 'line'];

const emptyForm = (): ProjectInput => ({
  name: '', description: '', geometry_type: 'point', accuracy_threshold: 10, max_images: 5, block_mock_location: false,
  state_ids: [], district_ids: [], season_ids: [], crop_ids: [],
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

  const [statusFilter, setStatusFilter] = useState('');
  const [_archiveConfirm, _setArchiveConfirm] = useState<string | null>(null);
  void _archiveConfirm; void _setArchiveConfirm;
  const [statusModal, setStatusModal] = useState<{ project: Project; next: ProjectStatus } | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Masters data for dropdowns
  const [masterStates, setMasterStates] = useState<MasterState[]>([]);
  const [masterDistricts, setMasterDistricts] = useState<MasterDistrict[]>([]);
  const [masterSeasons, setMasterSeasons] = useState<MasterSeason[]>([]);
  const [masterCrops, setMasterCrops] = useState<MasterCrop[]>([]);

  // Assignment modal state
  const [assignModal, setAssignModal] = useState<Project | null>(null);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  const fetchProjects = () => {
    setLoading(true);
    const params = statusFilter
      ? { status: statusFilter }
      : showArchived
        ? { include_archived: true }
        : {};
    getProjects(params)
      .then((r) => setProjects(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(fetchProjects, [showArchived, statusFilter]);

  useEffect(() => {
    getAllMasters().then((r) => {
      setMasterStates(r.data.states);
      setMasterDistricts(r.data.districts);
      setMasterSeasons(r.data.seasons);
      setMasterCrops(r.data.crops);
    }).catch(console.error);
  }, []);

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
      block_mock_location: config.block_mock_location === true,
      state_ids: p.state_ids || [],
      district_ids: p.district_ids || [],
      season_ids: p.season_ids || [],
      crop_ids: p.crop_ids || [],
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


  const handleStatusTransition = async () => {
    if (!statusModal) return;
    setStatusSaving(true);
    try {
      await setProjectStatus(statusModal.project.id, statusModal.next, statusNote || undefined);
      setStatusModal(null);
      setStatusNote('');
      fetchProjects();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Status change failed');
    } finally {
      setStatusSaving(false);
    }
  };

  const openAssignModal = async (p: Project) => {
    setAssignModal(p);
    setAssignLoading(true);
    try {
      const [aRes, uRes] = await Promise.all([getProjectAssignments(p.id), getUsers()]);
      setAssignments(aRes.data);
      setAllUsers(uRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAssign = async (userId: string) => {
    if (!assignModal) return;
    try {
      await assignUserToProject(assignModal.id, userId);
      const res = await getProjectAssignments(assignModal.id);
      setAssignments(res.data);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Assign failed');
    }
  };

  const handleUnassign = async (userId: string) => {
    if (!assignModal) return;
    try {
      await unassignUserFromProject(assignModal.id, userId);
      setAssignments((prev) => prev.filter((a) => a.id !== userId));
    } catch (e: any) {
      alert(e.response?.data?.error || 'Unassign failed');
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
      {/* Assign users modal */}
      {assignModal && (
        <div
          onClick={() => setAssignModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, color: '#1a3a2a' }}>Assign Users</h2>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>{assignModal.name}</p>
              </div>
              <button onClick={() => setAssignModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>

            {assignLoading ? (
              <div style={{ color: '#6b7280', fontSize: 14, padding: '16px 0' }}>Loading…</div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {/* Currently assigned */}
                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Assigned ({assignments.length})
                </p>
                {assignments.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>No users assigned yet</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                    {assignments.map((a) => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', borderRadius: 8, padding: '8px 12px', border: '1px solid #bbf7d0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <RoleBadge role={a.role} />
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#065f46' }}>{a.name}</span>
                            <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 6 }}>{a.mobile}</span>
                          </div>
                        </div>
                        <button onClick={() => handleUnassign(a.id)} title="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16, padding: '0 4px' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* All users not yet assigned */}
                {(() => {
                  const assignedIds = new Set(assignments.map((a) => a.id));
                  const unassigned = allUsers
                    .filter((u) => !assignedIds.has(u.id))
                    .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
                  if (unassigned.length === 0) return null;
                  return (
                    <>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Add User
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {unassigned.map((u) => (
                          <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <RoleBadge role={u.role} />
                              <div>
                                <span style={{ fontSize: 14, fontWeight: 500 }}>{u.name}</span>
                                <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 6 }}>{u.mobile}</span>
                              </div>
                            </div>
                            <button onClick={() => handleAssign(u.id)} style={{ background: '#40916c', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ Add</button>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status transition modal */}
      {statusModal && (
        <div
          onClick={() => setStatusModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 16, color: '#1a3a2a' }}>Change Project Status</h2>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
              {statusModal.project.name} →{' '}
              <span style={{ fontWeight: 700, color: STATUS_META[statusModal.next].color }}>
                {STATUS_META[statusModal.next].label}
              </span>
            </p>
            <label style={labelStyle}>Note (optional)</label>
            <textarea
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Reason for this transition…"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setStatusModal(null)} style={cancelBtnStyle}>Cancel</button>
              <button
                onClick={handleStatusTransition}
                disabled={statusSaving}
                style={{ ...saveBtnStyle, background: STATUS_META[statusModal.next].color }}
              >
                {statusSaving ? 'Saving…' : `Move to ${STATUS_META[statusModal.next].label}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/edit modal */}
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

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={form.block_mock_location === true}
                onChange={(e) => setForm({ ...form, block_mock_location: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: '#1a3a2a', cursor: 'pointer' }}
              />
              <span>
                <strong>Block mock/fake GPS</strong>
                <span style={{ color: '#6b7280', marginLeft: 6, fontSize: 12 }}>Surveyors must use real device GPS to capture location</span>
              </span>
            </label>

            {/* Masters multi-select */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
              <MasterMultiSelect
                label="States"
                options={masterStates.map((s) => ({ id: s.id, name: s.name }))}
                selected={form.state_ids || []}
                onChange={(ids) => setForm({ ...form, state_ids: ids, district_ids: [] })}
              />
              <MasterMultiSelect
                label="Districts"
                options={masterDistricts
                  .filter((d) => !(form.state_ids || []).length || (form.state_ids || []).includes(d.state_id))
                  .map((d) => ({ id: d.id, name: d.name }))}
                selected={form.district_ids || []}
                onChange={(ids) => setForm({ ...form, district_ids: ids })}
                searchable
              />
              <MasterMultiSelect
                label="Seasons"
                options={masterSeasons.map((s) => ({ id: s.id, name: s.name }))}
                selected={form.season_ids || []}
                onChange={(ids) => setForm({ ...form, season_ids: ids })}
              />
              <MasterMultiSelect
                label="Crops"
                options={masterCrops.map((c) => ({ id: c.id, name: c.name }))}
                selected={form.crop_ids || []}
                onChange={(ids) => setForm({ ...form, crop_ids: ids })}
                searchable
              />
            </div>

            {modal === 'create' && (
              <>
                <label style={labelStyle}>Initial Status</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['planning', 'active'] as const).map((s) => {
                    const m = STATUS_META[s];
                    const isSel = (form.initial_status || 'planning') === s;
                    return (
                      <button key={s} type="button" onClick={() => setForm({ ...form, initial_status: s })}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, border: '2px solid', borderColor: isSel ? m.color : '#e5e7eb', background: isSel ? m.bg : 'transparent', color: isSel ? m.color : '#6b7280', cursor: 'pointer', fontSize: 13, fontWeight: isSel ? 700 : 400 }}>
                        {m.icon} {m.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

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
            <input
              className="search-bar"
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {canEdit && (
              <button
                onClick={openCreate}
                style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#40916c', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                + New Project
              </button>
            )}
          </div>
        </div>

        {/* Status filter chips */}
        <div style={{ padding: '0 1rem 0.75rem', display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {STATUS_FILTER_OPTIONS.map((opt) => {
            const isActive = statusFilter === opt.value;
            const meta = opt.value ? STATUS_META[opt.value as ProjectStatus] : null;
            return (
              <button
                key={opt.value}
                onClick={() => { setStatusFilter(opt.value); setShowArchived(!!opt.value); }}
                style={{
                  padding: '0.25rem 0.75rem', borderRadius: 20, border: '1.5px solid',
                  borderColor: isActive ? (meta?.color || '#40916c') : 'var(--border)',
                  background: isActive ? (meta?.bg || '#d1fae5') : 'transparent',
                  color: isActive ? (meta?.color || '#059669') : 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '0.75rem', fontWeight: isActive ? 700 : 400,
                }}
              >
                {meta ? `${meta.icon} ` : ''}{opt.label}
              </button>
            );
          })}
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
                <th>Masters</th>
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
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      {p.description && <div style={{ fontSize: 12, color: '#6b7280' }}>{p.description}</div>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(p.state_names || []).map((n, i) => <span key={i} style={{ background: '#e0f0e6', color: '#1a3a2a', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>{n}</span>)}
                        {(p.district_names || []).map((n, i) => <span key={i} style={{ background: '#dbeafe', color: '#1e3a8a', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>{n}</span>)}
                        {(p.season_names || []).map((n, i) => <span key={i} style={{ background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>{n}</span>)}
                        {(p.crop_names || []).map((n, i) => <span key={i} style={{ background: '#fce7f3', color: '#9d174d', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>{n}</span>)}
                        {!(p.state_names?.length) && !(p.district_names?.length) && !(p.season_names?.length) && !(p.crop_names?.length) && <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>}
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                        {config.geometry_type === 'polygon' ? '⬡' : '📍'} {config.geometry_type || '—'}
                      </span>
                    </td>
                    <td>{p.survey_count ?? '—'}</td>
                    <td>
                      {(() => {
                        const m = STATUS_META[p.status as ProjectStatus];
                        return m ? (
                          <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: m.bg, color: m.color }}>
                            {m.icon} {m.label}
                          </span>
                        ) : <span>{p.status}</span>;
                      })()}
                    </td>
                    <td>{new Date(p.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => navigate(`/projects/${p.id}/lifecycle`)} title="Lifecycle & history" style={iconBtnStyle}>🔄</button>
                        <button onClick={() => navigate(`/projects/${p.id}/analytics`)} title="View analytics" style={iconBtnStyle}>📊</button>
                        <button onClick={() => navigate(`/projects/${p.id}/form`)} title="View / edit form" style={iconBtnStyle}>📋</button>
                        <button onClick={() => navigate(`/projects/${p.id}/templates`)} title="Survey templates" style={iconBtnStyle}>🔖</button>
                        <button onClick={() => handleDownloadPdf(p)} title="Download PDF report" style={iconBtnStyle}>📄</button>
                        {isAdmin && <button onClick={() => openAssignModal(p)} title="Assign users" style={iconBtnStyle}>👥</button>}
                        {canEdit && <button onClick={() => openEdit(p)} title="Edit project" style={iconBtnStyle}>✏️</button>}
                        {canEdit && (TRANSITIONS[p.status as ProjectStatus] || []).length > 0 && (
                          <div style={{ position: 'relative' }}>
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) setStatusModal({ project: p, next: e.target.value as ProjectStatus });
                              }}
                              style={{ fontSize: 11, borderRadius: 6, border: '1px solid #d1d5db', padding: '2px 4px', cursor: 'pointer', background: 'var(--bg)', color: 'var(--text)' }}
                              title="Change status"
                            >
                              <option value="">⟳ Status</option>
                              {(TRANSITIONS[p.status as ProjectStatus] || []).map((s) => (
                                <option key={s} value={s}>{STATUS_META[s].icon} {STATUS_META[s].label}</option>
                              ))}
                            </select>
                          </div>
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

const ROLE_ORDER = ['admin', 'supervisor', 'qc', 'surveyor'];

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  admin:      { label: 'Admin',      color: '#7c3aed', bg: '#ede9fe' },
  supervisor: { label: 'Supervisor', color: '#d97706', bg: '#fef3c7' },
  qc:         { label: 'QC',         color: '#0891b2', bg: '#e0f2fe' },
  surveyor:   { label: 'Surveyor',   color: '#059669', bg: '#d1fae5' },
};

function RoleBadge({ role }: { role: string }) {
  const m = ROLE_META[role] ?? { label: role, color: '#6b7280', bg: '#f3f4f6' };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
      background: m.bg, color: m.color, whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {m.label}
    </span>
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

function MasterMultiSelect({
  label, options, selected, onChange, searchable,
}: {
  label: string;
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  searchable?: boolean;
}) {
  const [search, setSearch] = React.useState('');
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const visible = searchable
    ? options.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
    : options;
  return (
    <div>
      <label style={labelStyle}>{label} {selected.length > 0 && <span style={{ color: '#40916c', fontWeight: 700 }}>({selected.length})</span>}</label>
      {searchable && (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${label.toLowerCase()}…`}
          style={{ ...inputStyle, marginBottom: 4, padding: '5px 10px', fontSize: 13 }}
        />
      )}
      <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #e0f0e6', borderRadius: 8, padding: '4px 8px' }}>
        {visible.length === 0 && <div style={{ fontSize: 12, color: '#9ca3af', padding: '4px 0' }}>No options</div>}
        {visible.map((opt) => (
          <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', cursor: 'pointer', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={selected.includes(opt.id)}
              onChange={() => toggle(opt.id)}
              style={{ accentColor: '#40916c' }}
            />
            {opt.name}
          </label>
        ))}
      </div>
    </div>
  );
}
