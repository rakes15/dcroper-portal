import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSurvey, getSurveyImages, approveSurvey, rejectSurvey } from '../api/surveys';
import type { SurveyDetail as SurveyDetailData, SurveyImage } from '../api/surveys';

export default function SurveyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<SurveyDetailData | null>(null);
  const [images, setImages] = useState<SurveyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [qcLoading, setQcLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([getSurvey(id), getSurveyImages(id)])
      .then(([s, img]) => {
        setSurvey(s.data);
        setImages(img.data);
      })
      .catch(() => setError('Survey not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleApprove = async () => {
    if (!id || !confirm('Approve this survey?')) return;
    setQcLoading(true);
    try {
      await approveSurvey(id);
      setSurvey((prev) => prev ? { ...prev, status: 'approved' } : prev);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Approve failed');
    } finally {
      setQcLoading(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    setQcLoading(true);
    try {
      await rejectSurvey(id, rejectReason || undefined);
      setSurvey((prev) => prev ? { ...prev, status: 'rejected' } : prev);
      setShowRejectForm(false);
      setRejectReason('');
    } catch (e: any) {
      alert(e.response?.data?.error || 'Reject failed');
    } finally {
      setQcLoading(false);
    }
  };

  if (loading) return <div className="loading" style={{ padding: 40 }}>Loading survey…</div>;
  if (error || !survey) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Survey not found</div>
      <div style={{ color: '#6b7280', marginBottom: 24 }}>The survey may not have synced to the server yet.</div>
      <button onClick={() => navigate('/surveys')} style={btnStyle}>← Back to Surveys</button>
    </div>
  );

  const formResponse = survey.form_response || {};
  const geometry = survey.geometry || {};
  const internalNotes = formResponse['_internal_notes'] as string | undefined;
  const formFields = Object.entries(formResponse).filter(([k]) => !k.startsWith('_'));
  const canQc = survey.status === 'submitted' || survey.status === 'pending';

  return (
    <div>
      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, cursor: 'zoom-out',
          }}
        >
          <img
            src={lightbox}
            alt="Survey photo"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain' }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 20, right: 24,
              background: 'rgba(255,255,255,0.15)', border: 'none',
              color: '#fff', fontSize: 24, cursor: 'pointer',
              borderRadius: '50%', width: 40, height: 40,
            }}
          >×</button>
        </div>
      )}

      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/surveys')} style={backBtnStyle}>←</button>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ fontSize: 20 }}>Survey Detail</h1>
          <p className="page-subtitle" style={{ fontFamily: 'monospace', fontSize: 12 }}>{survey.id}</p>
        </div>

        {/* QC Actions */}
        {canQc && !showRejectForm && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleApprove}
              disabled={qcLoading}
              style={{ ...btnStyle, background: '#059669', padding: '8px 16px', fontSize: 13 }}
            >
              ✓ Approve
            </button>
            <button
              onClick={() => setShowRejectForm(true)}
              disabled={qcLoading}
              style={{ ...btnStyle, background: '#dc2626', padding: '8px 16px', fontSize: 13 }}
            >
              ✗ Reject
            </button>
          </div>
        )}
        {survey.status === 'approved' && (
          <span className="badge badge-synced" style={{ fontSize: 13, padding: '6px 14px' }}>✓ Approved</span>
        )}
        {survey.status === 'rejected' && (
          <span className="badge" style={{ background: '#fee2e2', color: '#dc2626', fontSize: 13, padding: '6px 14px' }}>✗ Rejected</span>
        )}
      </div>

      {/* Reject form inline */}
      {showRejectForm && (
        <div className="table-card" style={{ padding: 16, marginBottom: 16, background: '#fff5f5', border: '1px solid #fecaca' }}>
          <div style={{ fontWeight: 600, marginBottom: 10, color: '#dc2626' }}>Rejection Reason</div>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Optional: describe the issue…"
            rows={3}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              border: '1px solid #fecaca', fontSize: 14, resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              onClick={handleReject}
              disabled={qcLoading}
              style={{ ...btnStyle, background: '#dc2626', padding: '8px 16px', fontSize: 13 }}
            >
              Confirm Reject
            </button>
            <button
              onClick={() => { setShowRejectForm(false); setRejectReason(''); }}
              style={{ ...btnStyle, background: '#6b7280', padding: '8px 16px', fontSize: 13 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Meta card */}
        <div className="table-card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 14, color: '#1a3a2a' }}>Survey Info</div>
          <dl style={dlStyle}>
            <FieldRow label="Status">
              {survey.status === 'approved'
                ? <span className="badge badge-synced">Approved</span>
                : survey.status === 'rejected'
                  ? <span className="badge" style={{ background: '#fee2e2', color: '#dc2626' }}>Rejected</span>
                  : survey.status === 'submitted' || survey.status === 'pending'
                    ? <span className="badge badge-synced">Submitted</span>
                    : survey.status === 'finalized'
                      ? <span className="badge badge-finalized">Finalized</span>
                      : <span className="badge badge-draft">Draft</span>}
            </FieldRow>
            <FieldRow label="Type">{survey.geometry_type}</FieldRow>
            <FieldRow label="Project"><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{survey.project_id}</span></FieldRow>
            <FieldRow label="Created">{new Date(survey.created_at).toLocaleString()}</FieldRow>
            {survey.updated_at && <FieldRow label="Updated">{new Date(survey.updated_at).toLocaleString()}</FieldRow>}
            {survey.accuracy != null && <FieldRow label="Accuracy">±{survey.accuracy.toFixed(1)} m</FieldRow>}
          </dl>
        </div>

        {/* Geometry card */}
        {Object.keys(geometry).length > 0 && (
          <div className="table-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 14, color: '#1a3a2a' }}>Geometry</div>
            <dl style={dlStyle}>
              <FieldRow label="Type">{(geometry as any).type || survey.geometry_type}</FieldRow>
              {(geometry as any).type === 'Point' && Array.isArray((geometry as any).coordinates) && (
                <>
                  <FieldRow label="Longitude">{((geometry as any).coordinates as number[])[0]?.toFixed(6)}</FieldRow>
                  <FieldRow label="Latitude">{((geometry as any).coordinates as number[])[1]?.toFixed(6)}</FieldRow>
                </>
              )}
              {(geometry as any).type === 'Polygon' && Array.isArray((geometry as any).coordinates) && (
                <FieldRow label="Vertices">
                  {((geometry as any).coordinates as number[][][])[0]?.length ?? 0} points
                </FieldRow>
              )}
            </dl>
            <pre style={codeStyle}>{JSON.stringify(geometry, null, 2)}</pre>
          </div>
        )}

        {/* Form response */}
        {formFields.length > 0 && (
          <div className="table-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 14, color: '#1a3a2a' }}>Form Data</div>
            <dl style={dlStyle}>
              {formFields.map(([key, val]) => (
                <FieldRow key={key} label={key}>{String(val)}</FieldRow>
              ))}
            </dl>
          </div>
        )}

        {/* Internal notes */}
        {internalNotes && (
          <div className="table-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 14, color: '#1a3a2a' }}>📝 Internal Notes</div>
            <p style={{ fontSize: 14, color: '#374151', whiteSpace: 'pre-wrap' }}>{internalNotes}</p>
          </div>
        )}
      </div>

      {/* Photo gallery */}
      {images.length > 0 && (
        <div className="table-card" style={{ padding: 20, marginTop: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 14, color: '#1a3a2a' }}>
            📷 Photos ({images.length})
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 10,
          }}>
            {images.map((img) => (
              <div
                key={img.id}
                onClick={() => setLightbox(`/uploads/${img.filename}`)}
                style={{
                  cursor: 'zoom-in',
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '1px solid #e0f0e6',
                  aspectRatio: '1',
                  background: '#f0faf4',
                }}
              >
                <img
                  src={`/uploads/${img.filename}`}
                  alt={img.original_name}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
            Click a photo to enlarge
          </div>
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '7px 0', borderBottom: '1px solid #f0faf2' }}>
      <dt style={{ fontSize: 12, color: '#6b7280', width: 100, flexShrink: 0, paddingTop: 2 }}>{label}</dt>
      <dd style={{ fontSize: 14, margin: 0, color: '#1a1a1a' }}>{children}</dd>
    </div>
  );
}

const dlStyle: React.CSSProperties = { margin: 0 };
const codeStyle: React.CSSProperties = {
  background: '#f8fdf9', border: '1px solid #e0f0e6', borderRadius: 8,
  padding: '10px 12px', fontSize: 11, overflow: 'auto', marginTop: 12,
  maxHeight: 180, color: '#374151',
};
const btnStyle: React.CSSProperties = {
  padding: '10px 20px', background: '#40916c', color: '#fff',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
};
const backBtnStyle: React.CSSProperties = {
  background: 'none', border: '1px solid #e0f0e6', borderRadius: 8,
  padding: '6px 12px', cursor: 'pointer', fontSize: 18, color: '#1a3a2a',
};
