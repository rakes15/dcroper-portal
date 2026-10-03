import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProjectForm, saveProjectForm } from '../api/forms';
import type { FormTab, FormSection, FieldRef } from '../api/forms';
import { getProject } from '../api/projects';
import type { Project } from '../api/projects';
import { getFieldMasters } from '../api/field_masters';
import type { FieldMaster } from '../api/field_masters';

function slug(label: string, prefix: string): string {
  return prefix + '_' + label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || prefix + '_' + Date.now();
}

function emptySection(label = 'Section'): FormSection {
  return { id: slug(label, 'sec') + '_' + Date.now(), label, field_refs: [] };
}

function emptyTab(label = 'Tab'): FormTab {
  return { id: slug(label, 'tab') + '_' + Date.now(), label, sections: [emptySection('General')] };
}

const TYPE_COLOR: Record<string, string> = {
  text: '#3b82f6', number: '#8b5cf6', textarea: '#f59e0b',
  dropdown: '#059669', image: '#ec4899', location: '#0ea5e9', date: '#f97316',
};
const TYPE_ICON: Record<string, string> = {
  text: 'T', number: '#', textarea: '¶', dropdown: '▾', image: '📷', location: '📍', date: '📅',
};

export default function FormBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [tabs, setTabs] = useState<FormTab[]>([emptyTab('General')]);
  const [activeTab, setActiveTab] = useState(0);
  const [masters, setMasters] = useState<FieldMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.allSettled([getProject(id), getProjectForm(id), getFieldMasters()])
      .then(([pr, fr, mr]) => {
        if (pr.status === 'fulfilled') setProject(pr.value.data);
        if (fr.status === 'fulfilled') {
          const loadedTabs = fr.value.data.tabs ?? [];
          setTabs(loadedTabs.length ? loadedTabs : [emptyTab('General')]);
        }
        if (mr.status === 'fulfilled') {
          setMasters((mr.value as FieldMaster[]).filter((m) => m.status === 'active'));
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  // ── tab ops ──────────────────────────────────────────────────────────────
  const addTab = () => {
    const t = emptyTab('Tab ' + (tabs.length + 1));
    setTabs((prev) => [...prev, t]);
    setActiveTab(tabs.length);
  };

  const removeTab = (ti: number) => {
    if (tabs.length === 1) return;
    setTabs((prev) => prev.filter((_, i) => i !== ti));
    setActiveTab((prev) => Math.min(prev, tabs.length - 2));
  };

  const patchTab = (ti: number, patch: Partial<FormTab>) =>
    setTabs((prev) => prev.map((t, i) => i === ti ? { ...t, ...patch } : t));

  const moveTab = (ti: number, dir: -1 | 1) => {
    const ni = ti + dir;
    if (ni < 0 || ni >= tabs.length) return;
    setTabs((prev) => { const a = [...prev]; [a[ti], a[ni]] = [a[ni], a[ti]]; return a; });
    setActiveTab(ni);
  };

  // ── section ops ──────────────────────────────────────────────────────────
  const addSection = (ti: number) =>
    patchTab(ti, { sections: [...tabs[ti].sections, emptySection('Section ' + (tabs[ti].sections.length + 1))] });

  const removeSection = (ti: number, si: number) => {
    if (tabs[ti].sections.length === 1) return;
    patchTab(ti, { sections: tabs[ti].sections.filter((_, i) => i !== si) });
  };

  const patchSection = (ti: number, si: number, patch: Partial<FormSection>) =>
    patchTab(ti, {
      sections: tabs[ti].sections.map((s, i) => i === si ? { ...s, ...patch } : s),
    });

  const moveSection = (ti: number, si: number, dir: -1 | 1) => {
    const ni = si + dir;
    const secs = [...tabs[ti].sections];
    if (ni < 0 || ni >= secs.length) return;
    [secs[si], secs[ni]] = [secs[ni], secs[si]];
    patchTab(ti, { sections: secs });
  };

  // ── field ref ops ────────────────────────────────────────────────────────
  const addRef = (ti: number, si: number, masterId: string) => {
    const sec = tabs[ti].sections[si];
    const refs = sec.field_refs ?? [];
    if (refs.some((r) => r.field_master_id === masterId)) return; // no dups
    patchSection(ti, si, { field_refs: [...refs, { field_master_id: masterId }] });
  };

  const removeRef = (ti: number, si: number, ri: number) =>
    patchSection(ti, si, { field_refs: (tabs[ti].sections[si].field_refs ?? []).filter((_, i) => i !== ri) });

  const patchRef = (ti: number, si: number, ri: number, patch: Partial<FieldRef>) =>
    patchSection(ti, si, {
      field_refs: (tabs[ti].sections[si].field_refs ?? []).map((r, i) => i === ri ? { ...r, ...patch } : r),
    });

  const moveRef = (ti: number, si: number, ri: number, dir: -1 | 1) => {
    const ni = ri + dir;
    const refs = [...(tabs[ti].sections[si].field_refs ?? [])];
    if (ni < 0 || ni >= refs.length) return;
    [refs[ri], refs[ni]] = [refs[ni], refs[ri]];
    patchSection(ti, si, { field_refs: refs });
  };

  // ── save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!id) return;
    setSaving(true); setSaveError('');
    try {
      await saveProjectForm(id, tabs);
      navigate(`/projects/${id}/form`);
    } catch (e: any) {
      setSaveError(e.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading" style={{ padding: 40 }}>Loading…</div>;

  const tab = tabs[activeTab] ?? tabs[0];
  const mastersMap = Object.fromEntries(masters.map((m) => [m.id, m]));
  const usedInSection = (si: number) =>
    new Set((tab.sections[si]?.field_refs ?? []).map((r) => r.field_master_id));



  return (
    <div>
      {/* ── header ── */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={() => navigate(`/projects/${id}/form`)} style={backBtn}>←</button>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ fontSize: 20 }}>Form Builder</h1>
          <p className="page-subtitle">{project?.name}</p>
        </div>
        <button onClick={handleSave} disabled={saving} style={saveBtn(saving)}>
          {saving ? 'Saving…' : '💾 Save Form'}
        </button>
      </div>

      {saveError && <div style={errBox}>{saveError}</div>}

      {/* ── tab bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {tabs.map((t, ti) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(ti)}
            style={tabChip(ti === activeTab)}
          >
            {t.label || `Tab ${ti + 1}`}
          </button>
        ))}
        <button onClick={addTab} style={addTabBtn}>+ Tab</button>
      </div>

      {/* ── active tab ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e0f0e6', padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tab label</span>
          <input
            value={tab.label}
            onChange={(e) => patchTab(activeTab, { label: e.target.value })}
            placeholder="Tab name…"
            style={{ ...inp, flex: 1 }}
          />
          <button onClick={() => moveTab(activeTab, -1)} disabled={activeTab === 0} style={iconBtn}>←</button>
          <button onClick={() => moveTab(activeTab, 1)} disabled={activeTab === tabs.length - 1} style={iconBtn}>→</button>
          <button
            onClick={() => removeTab(activeTab)}
            disabled={tabs.length === 1}
            style={{ ...iconBtn, color: '#dc2626' }}
            title="Delete tab"
          >✕</button>
        </div>

        {/* ── sections ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tab.sections.map((sec, si) => (
            <SectionCard
              key={sec.id}
              section={sec}
              si={si}
              total={tab.sections.length}
              masters={masters}
              mastersMap={mastersMap}
              used={usedInSection(si)}
              onLabelChange={(v) => patchSection(activeTab, si, { label: v })}
              onMoveSection={(dir) => moveSection(activeTab, si, dir)}
              onRemoveSection={() => removeSection(activeTab, si)}
              onAddRef={(mid) => addRef(activeTab, si, mid)}
              onRemoveRef={(ri) => removeRef(activeTab, si, ri)}
              onPatchRef={(ri, p) => patchRef(activeTab, si, ri, p)}
              onMoveRef={(ri, dir) => moveRef(activeTab, si, ri, dir)}
            />
          ))}
        </div>

        <button onClick={() => addSection(activeTab)} style={addSectionBtn}>+ Add Section</button>
      </div>

      {/* ── summary ── */}
      <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'right' }}>
        {tabs.length} tab{tabs.length !== 1 ? 's' : ''} ·{' '}
        {tabs.reduce((a, t) => a + t.sections.length, 0)} sections ·{' '}
        {tabs.reduce((a, t) => a + t.sections.reduce((b, s) => b + (s.field_refs?.length ?? 0), 0), 0)} field refs
      </div>
    </div>
  );
}

// ── SectionCard ──────────────────────────────────────────────────────────────
interface SectionCardProps {
  section: FormSection;
  si: number;
  total: number;
  masters: FieldMaster[];
  mastersMap: Record<string, FieldMaster>;
  used: Set<string>;
  onLabelChange: (v: string) => void;
  onMoveSection: (dir: -1 | 1) => void;
  onRemoveSection: () => void;
  onAddRef: (masterId: string) => void;
  onRemoveRef: (ri: number) => void;
  onPatchRef: (ri: number, patch: Partial<FieldRef>) => void;
  onMoveRef: (ri: number, dir: -1 | 1) => void;
}

function SectionCard({
  section, si, total, masters, mastersMap, used,
  onLabelChange, onMoveSection, onRemoveSection,
  onAddRef, onRemoveRef, onPatchRef, onMoveRef,
}: SectionCardProps) {
  const available = masters.filter((m) => !used.has(m.id));

  return (
    <div style={{ border: '1px solid #d1fae5', borderRadius: 10, overflow: 'hidden' }}>
      {/* section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f0fdf4' }}>
        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 700, minWidth: 20 }}>§{si + 1}</span>
        <input
          value={section.label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="Section name…"
          style={{ ...inp, flex: 1 }}
        />
        <button onClick={() => onMoveSection(-1)} disabled={si === 0} style={iconBtn}>↑</button>
        <button onClick={() => onMoveSection(1)} disabled={si === total - 1} style={iconBtn}>↓</button>
        <button onClick={onRemoveSection} disabled={total === 1} style={{ ...iconBtn, color: '#dc2626' }} title="Delete section">✕</button>
      </div>

      {/* field refs */}
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(section.field_refs?.length ?? 0) === 0 && (
          <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>
            No fields yet — pick a field master below
          </div>
        )}

        {(section.field_refs ?? []).map((ref, ri) => {
          const m = mastersMap[ref.field_master_id];
          return (
            <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {/* master pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '4px 10px', flex: 1, minWidth: 180 }}>
                {m && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                    background: (TYPE_COLOR[m.input_type] || '#6b7280') + '18',
                    color: TYPE_COLOR[m.input_type] || '#6b7280',
                  }}>
                    {TYPE_ICON[m.input_type] || '?'} {m.input_type}
                  </span>
                )}
                <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>
                  {m ? m.display_name : <span style={{ color: '#dc2626' }}>⚠ {ref.field_master_id} not found</span>}
                </span>
                {m && <code style={{ fontSize: 10, color: '#9ca3af' }}>{m.name}</code>}
              </div>

              {/* required override */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={ref.required ?? m?.is_required_default ?? false}
                  onChange={(e) => onPatchRef(ri, { required: e.target.checked })}
                />
                Required
              </label>

              {/* display name override */}
              <input
                value={ref.display_name ?? ''}
                onChange={(e) => onPatchRef(ri, { display_name: e.target.value || null })}
                placeholder={m?.display_name ?? 'Label override…'}
                style={{ ...inp, width: 140, fontSize: 12 }}
                title="Override display name (leave blank to use master's)"
              />

              {/* move + remove */}
              <div style={{ display: 'flex', gap: 3 }}>
                <button onClick={() => onMoveRef(ri, -1)} disabled={ri === 0} style={iconBtn}>↑</button>
                <button onClick={() => onMoveRef(ri, 1)} disabled={ri === (section.field_refs?.length ?? 0) - 1} style={iconBtn}>↓</button>
                <button onClick={() => onRemoveRef(ri)} style={{ ...iconBtn, color: '#dc2626' }}>✕</button>
              </div>
            </div>
          );
        })}

        {/* add field ref row */}
        {available.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <AddRefSelect
              available={available}
              onAdd={onAddRef}
            />
          </div>
        )}
        {masters.length > 0 && available.length === 0 && section.field_refs.length > 0 && (
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>All active field masters used in this section.</div>
        )}
      </div>
    </div>
  );
}

function AddRefSelect({ available, onAdd }: { available: FieldMaster[]; onAdd: (id: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <>
      <select
        value={val}
        onChange={(e) => setVal(e.target.value)}
        style={{ ...inp, flex: 1, fontSize: 12 }}
      >
        <option value="">— pick a field master —</option>
        {available.map((m) => (
          <option key={m.id} value={m.id}>
            {m.display_name} ({m.input_type}{m.data_type ? ', ' + m.data_type : ''})
          </option>
        ))}
      </select>
      <button
        onClick={() => { if (val) { onAdd(val); setVal(''); } }}
        disabled={!val}
        style={{
          padding: '6px 14px', borderRadius: 8, border: 'none',
          background: val ? '#40916c' : '#d1d5db', color: '#fff',
          cursor: val ? 'pointer' : 'default', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
        }}
      >
        + Add Field
      </button>
    </>
  );
}

// ── styles ───────────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 8, border: '1px solid #e0f0e6',
  fontSize: 13, background: '#fafafa', boxSizing: 'border-box',
};
const iconBtn: React.CSSProperties = {
  background: 'none', border: '1px solid #e5e7eb', borderRadius: 6,
  width: 28, height: 28, cursor: 'pointer', fontSize: 13,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const backBtn: React.CSSProperties = {
  background: '#f3f4f6', border: 'none', borderRadius: 8,
  width: 36, height: 36, cursor: 'pointer', fontSize: 16, fontWeight: 600,
};
const saveBtn = (saving: boolean): React.CSSProperties => ({
  padding: '8px 20px', borderRadius: 8, border: 'none',
  background: '#40916c', color: '#fff', cursor: 'pointer',
  fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1,
});
const tabChip = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
  background: active ? '#40916c' : '#f0fdf4',
  color: active ? '#fff' : '#374151',
  boxShadow: active ? '0 2px 6px #40916c44' : 'none',
});
const addTabBtn: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 20, border: '2px dashed #86efac',
  background: 'transparent', color: '#40916c', cursor: 'pointer', fontSize: 12, fontWeight: 600,
};
const addSectionBtn: React.CSSProperties = {
  marginTop: 10, width: '100%', padding: '10px', borderRadius: 8,
  border: '2px dashed #86efac', background: '#f0fdf4',
  color: '#40916c', cursor: 'pointer', fontSize: 13, fontWeight: 600,
};
const errBox: React.CSSProperties = {
  background: '#fee2e2', color: '#dc2626', borderRadius: 8,
  padding: '10px 14px', marginBottom: 14, fontSize: 13,
};
