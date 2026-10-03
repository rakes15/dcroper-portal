import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProjectForm } from '../api/forms';
import type { FormTab } from '../api/forms';
import { getProject } from '../api/projects';
import type { Project } from '../api/projects';
import { getFieldMasters } from '../api/field_masters';
import type { FieldMaster } from '../api/field_masters';

const TYPE_COLOR: Record<string, string> = {
  text: '#3b82f6', number: '#8b5cf6', textarea: '#f59e0b',
  dropdown: '#059669', image: '#ec4899', location: '#0ea5e9', date: '#f97316',
};
const TYPE_ICON: Record<string, string> = {
  text: 'T', number: '#', textarea: '¶', dropdown: '▾', image: '📷', location: '📍', date: '📅',
};

export default function ProjectForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tabs, setTabs] = useState<FormTab[]>([]);
  const [mastersMap, setMastersMap] = useState<Record<string, FieldMaster>>({});
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.allSettled([getProject(id), getProjectForm(id), getFieldMasters()])
      .then(([pr, fr, mr]) => {
        if (pr.status === 'fulfilled') setProject(pr.value.data);
        if (fr.status === 'fulfilled') setTabs(fr.value.data.tabs ?? []);
        if (mr.status === 'fulfilled')
          setMastersMap(Object.fromEntries((mr.value as FieldMaster[]).map((m) => [m.id, m])));
      })
      .finally(() => setLoading(false));
  }, [id]);

  const totalRefs = tabs.reduce((a, t) => a + t.sections.reduce((b, s) => b + (s.field_refs?.length ?? 0), 0), 0);

  if (loading) return <div className="loading" style={{ padding: 40 }}>Loading form…</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/projects')} style={backBtn}>←</button>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ fontSize: 20 }}>Form Definition</h1>
          <p className="page-subtitle">{project?.name}</p>
        </div>
        <button onClick={() => navigate(`/projects/${id}/form/edit`)} style={editBtn}>
          ✏️ Edit Form
        </button>
      </div>

      {tabs.length === 0 ? (
        <div className="table-card" style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No form configured yet</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Build the form using tabs, sections, and field masters.</div>
          <button onClick={() => navigate(`/projects/${id}/form/edit`)} style={editBtn}>
            + Build Form
          </button>
        </div>
      ) : (
        <>
          {/* stats */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Tabs', value: tabs.length },
              { label: 'Sections', value: tabs.reduce((a, t) => a + t.sections.length, 0) },
              { label: 'Field Refs', value: totalRefs },
            ].map((s) => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid #e0f0e6', borderRadius: 10, padding: '10px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1b4332' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* tab bar */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {tabs.map((t, ti) => (
              <button key={t.id} onClick={() => setActiveTab(ti)} style={tabChip(ti === activeTab)}>
                {t.label}
                <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>
                  ({t.sections.reduce((b, s) => b + (s.field_refs?.length ?? 0), 0)})
                </span>
              </button>
            ))}
          </div>

          {/* active tab sections */}
          {(tabs[activeTab]?.sections ?? []).map((sec, si) => {
            const refs = sec.field_refs ?? [];
            return (
              <div key={sec.id} className="table-card" style={{ marginBottom: 12 }}>
                <div className="table-header">
                  <span className="table-title" style={{ fontSize: 14 }}>
                    §{si + 1} &nbsp; {sec.label}
                  </span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>
                    {refs.length} field{refs.length !== 1 ? 's' : ''}
                    {refs.filter((r) => r.required ?? mastersMap[r.field_master_id]?.is_required_default).length > 0 &&
                      ` · ${refs.filter((r) => r.required ?? mastersMap[r.field_master_id]?.is_required_default).length} required`}
                  </span>
                </div>
                {refs.length === 0 ? (
                  <div style={{ padding: '16px 0', textAlign: 'center', color: '#d1d5db', fontSize: 13 }}>No fields in this section</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 32 }}>#</th>
                        <th>Field Master</th>
                        <th>Display Label</th>
                        <th>Type</th>
                        <th>Validation</th>
                        <th>Required</th>
                      </tr>
                    </thead>
                    <tbody>
                      {refs.map((ref, ri) => {
                        const m = mastersMap[ref.field_master_id];
                        const isRequired = ref.required ?? m?.is_required_default ?? false;
                        return (
                          <tr key={ri}>
                            <td style={{ color: '#9ca3af', fontSize: 12 }}>{ri + 1}</td>
                            <td>
                              <code style={{ fontSize: 12, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>
                                {ref.field_master_id}
                              </code>
                            </td>
                            <td style={{ fontWeight: 500 }}>
                              {ref.display_name || m?.display_name || <span style={{ color: '#9ca3af' }}>—</span>}
                              {ref.display_name && m && ref.display_name !== m.display_name && (
                                <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>(overridden)</span>
                              )}
                            </td>
                            <td>
                              {m ? (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  background: (TYPE_COLOR[m.input_type] || '#6b7280') + '18',
                                  color: TYPE_COLOR[m.input_type] || '#6b7280',
                                  borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600,
                                }}>
                                  <span>{TYPE_ICON[m.input_type] || '?'}</span> {m.input_type}
                                  {m.data_type && <span style={{ fontSize: 10, opacity: 0.7 }}>/{m.data_type}</span>}
                                </span>
                              ) : <span style={{ color: '#ef4444', fontSize: 12 }}>⚠ not found</span>}
                            </td>
                            <td style={{ fontSize: 12, color: '#6b7280' }}>
                              {m?.validation_regex
                                ? <code style={{ fontSize: 11, background: '#f3f4f6', padding: '1px 5px', borderRadius: 4 }}>{m.validation_regex}</code>
                                : m?.input_length
                                  ? <span>max {m.input_length}</span>
                                  : <span style={{ color: '#d1d5db' }}>—</span>}
                            </td>
                            <td>
                              {isRequired
                                ? <span style={{ color: '#059669', fontWeight: 600, fontSize: 12 }}>✓ Required</span>
                                : <span style={{ color: '#9ca3af', fontSize: 12 }}>Optional</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

const backBtn: React.CSSProperties = {
  background: '#f3f4f6', border: 'none', borderRadius: 8,
  width: 36, height: 36, cursor: 'pointer', fontSize: 16, fontWeight: 600,
};
const editBtn: React.CSSProperties = {
  padding: '8px 18px', borderRadius: 8, border: 'none',
  background: '#40916c', color: '#fff', cursor: 'pointer',
  fontSize: 13, fontWeight: 600,
};
const tabChip = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
  background: active ? '#40916c' : '#f0fdf4',
  color: active ? '#fff' : '#374151',
  boxShadow: active ? '0 2px 6px #40916c44' : 'none',
});
