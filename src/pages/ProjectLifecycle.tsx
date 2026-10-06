import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, getProjectHistory, setProjectStatus, TRANSITIONS, STATUS_META } from '../api/projects';
import type { Project, StatusHistoryEntry, ProjectStatus } from '../api/projects';
import { useAuth } from '../context/AuthContext';

const _FLOW: ProjectStatus[][] = [
  ['planning'],
  ['active'],
  ['on_hold', 'completed'],
  ['archived', 'cancelled'],
];
void _FLOW;

const _ALL_STATUSES = Object.keys(STATUS_META) as ProjectStatus[];
void _ALL_STATUSES;

export default function ProjectLifecycle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'supervisor';

  const [project, setProject] = useState<Project | null>(null);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [transitioning, setTransitioning] = useState<ProjectStatus | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    if (!id) return;
    Promise.all([getProject(id), getProjectHistory(id)])
      .then(([pr, hr]) => { setProject(pr.data); setHistory(hr.data); })
      .catch(() => setError('Failed to load project'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleTransition = async () => {
    if (!transitioning || !id) return;
    setSaving(true);
    setError('');
    try {
      await setProjectStatus(id, transitioning, note || undefined);
      setTransitioning(null);
      setNote('');
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Transition failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading…</div>;
  if (!project) return <div style={{ padding: '2rem', color: '#dc2626' }}>Project not found</div>;

  const currentStatus = project.status as ProjectStatus;
  const meta = STATUS_META[currentStatus];
  const nextStatuses = (TRANSITIONS[currentStatus] || []) as ProjectStatus[];

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <button
          onClick={() => navigate('/projects')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.875rem', padding: 0 }}
        >
          ← Projects
        </button>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{project.name}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>{project.name}</h1>
          {project.description && <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{project.description}</p>}
        </div>
        <span style={{
          padding: '0.35rem 0.875rem', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700,
          background: meta.bg, color: meta.color, letterSpacing: '0.04em',
        }}>
          {meta.icon} {meta.label.toUpperCase()}
        </span>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left: Lifecycle diagram + transition */}
        <div>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 1rem' }}>
              Lifecycle
            </h2>
            <LifecycleDiagram current={currentStatus} />
          </div>

          {/* Key dates */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.75rem' }}>
              Key Dates
            </h2>
            <DateRow label="Created" value={project.created_at} />
            <DateRow label="Started" value={project.started_at} />
            <DateRow label="Completed" value={project.completed_at} />
            <DateRow label="Last updated" value={project.updated_at} />
          </div>

          {/* Transition panel */}
          {canEdit && nextStatuses.length > 0 && (
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.75rem' }}>
                Transition To
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: transitioning ? '0.75rem' : 0 }}>
                {nextStatuses.map((s) => {
                  const m = STATUS_META[s];
                  const isSelected = transitioning === s;
                  return (
                    <button
                      key={s}
                      onClick={() => { setTransitioning(isSelected ? null : s); setNote(''); setError(''); }}
                      style={{
                        padding: '0.4rem 0.875rem', borderRadius: 8, border: `2px solid`,
                        borderColor: isSelected ? m.color : 'var(--border)',
                        background: isSelected ? m.bg : 'transparent',
                        color: isSelected ? m.color : 'var(--text)',
                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                      }}
                    >
                      {m.icon} {m.label}
                    </button>
                  );
                })}
              </div>
              {transitioning && (
                <div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={`Optional note for transition to ${STATUS_META[transitioning].label}…`}
                    rows={2}
                    style={{
                      width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6,
                      border: '1px solid var(--border)', background: 'var(--bg)',
                      color: 'var(--text)', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => { setTransitioning(null); setNote(''); }}
                      style={{ padding: '0.4rem 0.875rem', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleTransition}
                      disabled={saving}
                      style={{
                        padding: '0.4rem 0.875rem', borderRadius: 6, border: 'none',
                        background: STATUS_META[transitioning].color, color: '#fff',
                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                      }}
                    >
                      {saving ? 'Saving…' : `Move to ${STATUS_META[transitioning].label}`}
                    </button>
                  </div>
                </div>
              )}
              {nextStatuses.length === 0 && (
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  This status is terminal — no further transitions.
                </p>
              )}
            </div>
          )}

          {!canEdit && (
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Admins and supervisors can change the project status.
            </div>
          )}
        </div>

        {/* Right: History timeline */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 1rem' }}>
            Status History
          </h2>
          {history.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No history yet.</p>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* vertical line */}
              <div style={{ position: 'absolute', left: 15, top: 8, bottom: 8, width: 2, background: 'var(--border)' }} />
              {history.map((h, i) => {
                const toMeta = STATUS_META[h.to_status as ProjectStatus];
                const isLast = i === history.length - 1;
                return (
                  <div key={h.id} style={{ display: 'flex', gap: '0.875rem', marginBottom: isLast ? 0 : '1rem', position: 'relative' }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: toMeta?.bg || '#f3f4f6', border: `2px solid ${toMeta?.color || '#9ca3af'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', zIndex: 1,
                    }}>
                      {toMeta?.icon || '•'}
                    </div>
                    <div style={{ flex: 1, paddingTop: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {h.from_status ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <span style={{ color: STATUS_META[h.from_status as ProjectStatus]?.color }}>{STATUS_META[h.from_status as ProjectStatus]?.label || h.from_status}</span>
                            {' → '}
                            <span style={{ color: toMeta?.color, fontWeight: 700 }}>{toMeta?.label || h.to_status}</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: toMeta?.color }}>
                            Created as {toMeta?.label || h.to_status}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {h.changed_by_name} · {new Date(h.created_at).toLocaleString()}
                      </div>
                      {h.note && (
                        <div style={{
                          marginTop: '0.25rem', padding: '0.25rem 0.5rem', borderRadius: 4,
                          background: 'var(--bg)', border: '1px solid var(--border)',
                          fontSize: '0.75rem', color: 'var(--text)', fontStyle: 'italic',
                        }}>
                          "{h.note}"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LifecycleDiagram({ current }: { current: ProjectStatus }) {
  const nodes: { status: ProjectStatus; x: number; y: number }[] = [
    { status: 'planning',  x: 100, y: 30 },
    { status: 'active',    x: 100, y: 95 },
    { status: 'on_hold',   x: 30,  y: 160 },
    { status: 'completed', x: 170, y: 160 },
    { status: 'archived',  x: 100, y: 225 },
    { status: 'cancelled', x: 30,  y: 225 },
  ];

  const edges: [ProjectStatus, ProjectStatus][] = [
    ['planning',  'active'],
    ['planning',  'cancelled'],
    ['active',    'on_hold'],
    ['active',    'completed'],
    ['active',    'cancelled'],
    ['on_hold',   'active'],
    ['on_hold',   'cancelled'],
    ['completed', 'archived'],
    ['active',    'archived'],
  ];

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.status, n]));

  return (
    <svg viewBox="0 0 200 260" width="100%" style={{ display: 'block', maxWidth: 220, margin: '0 auto' }}>
      {edges.map(([from, to]) => {
        const f = nodeMap[from], t = nodeMap[to];
        return (
          <line
            key={`${from}-${to}`}
            x1={f.x} y1={f.y + 10} x2={t.x} y2={t.y - 10}
            stroke={current === from ? STATUS_META[from].color : '#d1d5db'}
            strokeWidth={current === from ? 1.5 : 1}
            strokeDasharray={current === from ? undefined : '3 3'}
          />
        );
      })}
      {nodes.map(({ status, x, y }) => {
        const m = STATUS_META[status];
        const isCurrent = status === current;
        const isPast = isCompleted(current, status);
        return (
          <g key={status}>
            <circle
              cx={x} cy={y} r={12}
              fill={isCurrent ? m.color : isPast ? m.bg : 'var(--bg, #f9fafb)'}
              stroke={isCurrent ? m.color : isPast ? m.color : '#d1d5db'}
              strokeWidth={isCurrent ? 2.5 : 1.5}
            />
            <text
              x={x} y={y + 1}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={isCurrent ? 11 : 9}
              fill={isCurrent ? '#fff' : isPast ? m.color : '#9ca3af'}
            >
              {m.icon}
            </text>
            <text
              x={x > 100 ? x + 16 : x < 100 ? x - 16 : x}
              y={y}
              textAnchor={x > 100 ? 'start' : x < 100 ? 'end' : 'middle'}
              dominantBaseline="middle"
              fontSize={9}
              fill={isCurrent ? m.color : '#6b7280'}
              fontWeight={isCurrent ? 700 : 400}
            >
              {m.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const ORDER: ProjectStatus[] = ['planning', 'active', 'on_hold', 'completed', 'archived'];
function isCompleted(current: ProjectStatus, status: ProjectStatus) {
  return ORDER.indexOf(current) > ORDER.indexOf(status);
}

function DateRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
        {value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
      </span>
    </div>
  );
}
