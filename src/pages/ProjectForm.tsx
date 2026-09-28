import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProjectForm } from '../api/forms';
import type { FormField } from '../api/forms';
import { getProject } from '../api/projects';
import type { Project } from '../api/projects';

const TYPE_ICON: Record<string, string> = {
  text: 'T', number: '#', textarea: '¶', dropdown: '▾', image: '📷',
};
const TYPE_COLOR: Record<string, string> = {
  text: '#3b82f6', number: '#8b5cf6', textarea: '#f59e0b', dropdown: '#059669', image: '#ec4899',
};

export default function ProjectForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getProject(id), getProjectForm(id)])
      .then(([p, f]) => {
        setProject(p.data);
        setFields(f.data.fields || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading" style={{ padding: 40 }}>Loading form…</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/projects')} style={backBtn}>←</button>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ fontSize: 20 }}>Form Definition</h1>
          <p className="page-subtitle">{project?.name}</p>
        </div>
        <button
          onClick={() => navigate(`/projects/${id}/form/edit`)}
          style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: '#40916c', color: '#fff', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
          }}
        >
          ✏️ Edit Form
        </button>
      </div>

      {fields.length === 0 ? (
        <div className="table-card" style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No form fields yet</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Add fields to define what surveyors collect.</div>
          <button
            onClick={() => navigate(`/projects/${id}/form/edit`)}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#40916c', color: '#fff', cursor: 'pointer', fontSize: 13 }}
          >
            + Add Fields
          </button>
        </div>
      ) : (
        <div className="table-card">
          <div className="table-header">
            <span className="table-title">Form Fields ({fields.length})</span>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>
              {fields.filter((f) => f.required).length} required
            </span>
          </div>
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>Field ID</th>
                <th>Label</th>
                <th>Type</th>
                <th>Required</th>
                <th>Options / Hint</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => (
                <tr key={f.id}>
                  <td style={{ color: '#9ca3af', fontSize: 12 }}>{i + 1}</td>
                  <td>
                    <code style={{ fontSize: 12, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>
                      {f.id}
                    </code>
                  </td>
                  <td style={{ fontWeight: 500 }}>{f.label}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: TYPE_COLOR[f.type] + '18',
                      color: TYPE_COLOR[f.type],
                      borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600,
                    }}>
                      <span style={{ fontWeight: 700 }}>{TYPE_ICON[f.type]}</span> {f.type}
                    </span>
                  </td>
                  <td>
                    {f.required
                      ? <span style={{ color: '#059669', fontWeight: 600, fontSize: 12 }}>✓ Required</span>
                      : <span style={{ color: '#9ca3af', fontSize: 12 }}>Optional</span>}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {f.type === 'dropdown' && f.options?.length > 0
                      ? <span style={{ color: '#6b7280' }}>{f.options.join(', ')}</span>
                      : f.hint
                        ? <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>{f.hint}</span>
                        : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const backBtn: React.CSSProperties = {
  background: '#f3f4f6', border: 'none', borderRadius: 8,
  width: 36, height: 36, cursor: 'pointer', fontSize: 16, fontWeight: 600,
};
