import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProjectForm, saveProjectForm } from '../api/forms';
import type { FormField } from '../api/forms';
import { getProject } from '../api/projects';
import type { Project } from '../api/projects';

const FIELD_TYPES: FormField['type'][] = ['text', 'number', 'textarea', 'dropdown', 'image'];

function makeId(label: string): string {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field';
}

function emptyField(): FormField {
  return { id: '', type: 'text', label: '', required: false, options: [], hint: '', image_source: 'both' };
}

export default function FormBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [optionInputs, setOptionInputs] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!id) return;
    Promise.all([getProject(id), getProjectForm(id)])
      .then(([p, f]) => {
        setProject(p.data);
        setFields(f.data.fields?.length ? f.data.fields : [emptyField()]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const updateField = (idx: number, patch: Partial<FormField>) => {
    setFields((prev) => prev.map((f, i) => {
      if (i !== idx) return f;
      const updated = { ...f, ...patch };
      if ('label' in patch && !patch.id) {
        updated.id = makeId(patch.label ?? '');
      }
      return updated;
    }));
  };

  const addField = () => setFields((prev) => [...prev, emptyField()]);

  const removeField = (idx: number) => setFields((prev) => prev.filter((_, i) => i !== idx));

  const moveField = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= fields.length) return;
    setFields((prev) => {
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  const addOption = (idx: number) => {
    const val = (optionInputs[idx] ?? '').trim();
    if (!val) return;
    updateField(idx, { options: [...(fields[idx].options ?? []), val] });
    setOptionInputs((prev) => ({ ...prev, [idx]: '' }));
  };

  const removeOption = (fieldIdx: number, optIdx: number) => {
    updateField(fieldIdx, { options: fields[fieldIdx].options.filter((_, i) => i !== optIdx) });
  };

  const handleSave = async () => {
    if (!id) return;
    const invalid = fields.find((f) => !f.label.trim() || !f.id.trim());
    if (invalid) { setSaveError('All fields must have a label.'); return; }
    setSaving(true);
    setSaveError('');
    try {
      await saveProjectForm(id, fields);
      navigate(`/projects/${id}/form`);
    } catch (e: any) {
      setSaveError(e.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading" style={{ padding: 40 }}>Loading form…</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(`/projects/${id}/form`)} style={backBtn}>←</button>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ fontSize: 20 }}>Form Builder</h1>
          <p className="page-subtitle">{project?.name}</p>
        </div>
        <button onClick={handleSave} disabled={saving} style={{
          padding: '8px 20px', borderRadius: 8, border: 'none',
          background: '#40916c', color: '#fff', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1,
        }}>
          {saving ? 'Saving…' : '💾 Save Form'}
        </button>
      </div>

      {saveError && (
        <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
          {saveError}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {fields.map((field, idx) => (
          <div key={idx} style={{
            background: '#fff', borderRadius: 12, border: '1px solid #e0f0e6',
            padding: 16,
          }}>
            {/* Field header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ color: '#9ca3af', fontSize: 13, fontWeight: 600, minWidth: 24 }}>{idx + 1}</span>

              {/* Type */}
              <select
                value={field.type}
                onChange={(e) => updateField(idx, { type: e.target.value as FormField['type'], options: [] })}
                style={{ ...inputStyle, width: 130 }}
              >
                {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>

              {/* Label */}
              <input
                value={field.label}
                onChange={(e) => updateField(idx, { label: e.target.value })}
                placeholder="Field label…"
                style={{ ...inputStyle, flex: 1 }}
              />

              {/* ID (readonly preview) */}
              <code style={{
                fontSize: 11, background: '#f3f4f6', padding: '4px 8px',
                borderRadius: 6, color: '#6b7280', minWidth: 80,
              }}>
                {field.id || makeId(field.label) || '—'}
              </code>

              {/* Required toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(idx, { required: e.target.checked })}
                />
                Required
              </label>

              {/* Move + delete */}
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => moveField(idx, -1)} disabled={idx === 0} style={iconBtn}>↑</button>
                <button onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1} style={iconBtn}>↓</button>
                <button onClick={() => removeField(idx)} style={{ ...iconBtn, color: '#dc2626' }}>✕</button>
              </div>
            </div>

            {/* Hint */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                value={field.hint}
                onChange={(e) => updateField(idx, { hint: e.target.value })}
                placeholder="Hint / helper text (optional)"
                style={{ ...inputStyle, flex: 2, minWidth: 180 }}
              />

              {field.type === 'image' && (
                <select
                  value={field.image_source}
                  onChange={(e) => updateField(idx, { image_source: e.target.value as FormField['image_source'] })}
                  style={{ ...inputStyle, width: 140 }}
                >
                  <option value="both">Camera + Gallery</option>
                  <option value="camera">Camera only</option>
                  <option value="gallery">Gallery only</option>
                </select>
              )}
            </div>

            {/* Options for dropdown */}
            {field.type === 'dropdown' && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Options:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {(field.options ?? []).map((opt, oi) => (
                    <span key={oi} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: '#f0fdf4', border: '1px solid #86efac',
                      borderRadius: 6, padding: '3px 10px', fontSize: 12,
                    }}>
                      {opt}
                      <button onClick={() => removeOption(idx, oi)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#dc2626', fontSize: 12, padding: 0, lineHeight: 1,
                      }}>×</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={optionInputs[idx] ?? ''}
                    onChange={(e) => setOptionInputs((prev) => ({ ...prev, [idx]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addOption(idx)}
                    placeholder="Type option and press Enter"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button onClick={() => addOption(idx)} style={{
                    padding: '6px 14px', borderRadius: 8, border: 'none',
                    background: '#40916c', color: '#fff', cursor: 'pointer', fontSize: 13,
                  }}>
                    + Add
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={addField} style={{
        marginTop: 14, width: '100%', padding: '12px', borderRadius: 12,
        border: '2px dashed #86efac', background: '#f0fdf4',
        color: '#40916c', cursor: 'pointer', fontSize: 14, fontWeight: 600,
      }}>
        + Add Field
      </button>
    </div>
  );
}

const backBtn: React.CSSProperties = {
  background: '#f3f4f6', border: 'none', borderRadius: 8,
  width: 36, height: 36, cursor: 'pointer', fontSize: 16, fontWeight: 600,
};
const inputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 8, border: '1px solid #e0f0e6',
  fontSize: 13, background: '#fafafa', boxSizing: 'border-box',
};
const iconBtn: React.CSSProperties = {
  background: 'none', border: '1px solid #e5e7eb', borderRadius: 6,
  width: 28, height: 28, cursor: 'pointer', fontSize: 13,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
