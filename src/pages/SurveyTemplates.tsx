import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTemplates, deleteTemplate } from '../api/survey_templates';
import type { SurveyTemplate } from '../api/survey_templates';
import { useAuth } from '../context/AuthContext';

export default function SurveyTemplates() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    getTemplates(projectId)
      .then(r => setTemplates(r.data))
      .catch(() => setError('Failed to load templates'))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete template "${name}"?`)) return;
    setDeleting(id);
    try {
      await deleteTemplate(id);
      setTemplates(t => t.filter(x => x.id !== id));
    } catch {
      alert('Failed to delete template');
    } finally {
      setDeleting(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  function formatValues(fv: Record<string, unknown>) {
    const entries = Object.entries(fv).filter(([k]) => !k.startsWith('_weather_'));
    return entries.slice(0, 4).map(([k, v]) =>
      `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`
    ).join(' · ') + (entries.length > 4 ? ` +${entries.length - 4} more` : '');
  }

  return (
    <div style={{ padding: '0 24px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link
          to="/projects"
          style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: 13 }}
        >
          Projects
        </Link>
        <span style={{ color: 'var(--color-text-muted)' }}>›</span>
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          Templates
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Survey Templates</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
            Reusable form value presets created from the mobile app
          </p>
        </div>
        <span style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 20,
          padding: '4px 14px',
          fontSize: 13,
          color: 'var(--color-text-muted)',
        }}>
          {templates.length} template{templates.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
          Loading…
        </div>
      )}

      {error && (
        <div style={{
          background: '#fee2e2', color: '#dc2626',
          padding: '12px 16px', borderRadius: 8, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {!loading && !error && templates.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔖</div>
          <p style={{ margin: 0, fontWeight: 600 }}>No templates yet</p>
          <p style={{ margin: '8px 0 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
            Open a survey in the mobile app, fill in the form, then use the overflow menu → "Save as template".
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {templates.map(t => (
          <div
            key={t.id}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>🔖</span>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</span>
                <span style={{
                  fontSize: 11,
                  color: 'var(--color-text-muted)',
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 4,
                  padding: '2px 7px',
                }}>
                  {Object.keys(t.form_values).filter(k => !k.startsWith('_weather_')).length} fields
                </span>
              </div>
              {Object.keys(t.form_values).length > 0 && (
                <p style={{
                  margin: '0 0 8px',
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {formatValues(t.form_values)}
                </p>
              )}
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Created by <strong>{t.created_by_name}</strong> · {formatDate(t.created_at)}
              </div>
            </div>

            {(user?.role === 'admin' || t.created_by === user?.id) && (
              <button
                onClick={() => handleDelete(t.id, t.name)}
                disabled={deleting === t.id}
                style={{
                  background: 'transparent',
                  border: '1px solid #fca5a5',
                  borderRadius: 6,
                  color: '#dc2626',
                  cursor: 'pointer',
                  padding: '6px 12px',
                  fontSize: 13,
                  flexShrink: 0,
                  opacity: deleting === t.id ? 0.5 : 1,
                }}
              >
                {deleting === t.id ? '…' : 'Delete'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
