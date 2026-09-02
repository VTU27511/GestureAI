import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gestureService } from '../../services/gestureService';
import { Gesture, GestureType } from '../../types';
import { StatusBadge, GestureTypeBadge } from '../../components/StatusBadge';
import { DeleteModal } from '../../components/DeleteModal';
import { ArrowLeft, Save, Trash2, AlertCircle, CheckCircle2, Activity, Play } from 'lucide-react';

export const GestureDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [meaning, setMeaning] = useState('');
  const [speechText, setSpeechText] = useState('');
  const [gestureType, setGestureType] = useState<GestureType>('ONE_HAND');
  const [objectName, setObjectName] = useState('');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchGesture = async () => {
      try {
        setLoading(true);
        const data = await gestureService.getGesture(id);
        setGesture(data);
        setName(data.name);
        setMeaning(data.meaning);
        setSpeechText(data.speech_text);
        setGestureType(data.gesture_type);
        setObjectName(data.object_name || '');
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Gesture not found.');
      } finally {
        setLoading(false);
      }
    };

    fetchGesture();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setError(null);
    setSuccess(null);

    if (gestureType === 'HAND_OBJECT' && !objectName.trim()) {
      setError('Object Name is required for HAND + OBJECT gestures.');
      return;
    }

    setSaving(true);

    try {
      const updated = await gestureService.updateGesture(id, {
        name: name.trim().toUpperCase(),
        meaning: meaning.trim(),
        speech_text: speechText.trim(),
        gesture_type: gestureType,
        object_name: gestureType === 'HAND_OBJECT' ? objectName.trim() : null,
      });

      setGesture(updated);
      setSuccess('Gesture details updated successfully!');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update gesture.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      setIsDeleting(true);
      await gestureService.deleteGesture(id);
      navigate('/user/gestures');
    } catch (err) {
      console.error('Failed to delete gesture', err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        Loading gesture details...
      </div>
    );
  }

  if (!gesture) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
        <p style={{ color: 'var(--accent-rose)', marginBottom: '1rem' }}>
          {error || 'Gesture not found or access denied.'}
        </p>
        <button className="btn btn-secondary" onClick={() => navigate('/user/gestures')}>
          <ArrowLeft size={16} /> Return to Gestures
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate('/user/gestures')}
        >
          <ArrowLeft size={16} /> Back to My Gestures
        </button>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/user/training?gesture_id=${gesture.id}`)}
          >
            <Activity size={14} /> Collect Samples
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(`/user/recognition?gesture_id=${gesture.id}`)}
          >
            <Play size={14} /> Test Recognition
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <h1 className="card-title" style={{ fontSize: '1.6rem' }}>{gesture.name}</h1>
              <StatusBadge status={gesture.status} />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Created: {new Date(gesture.created_at).toLocaleDateString()} · Last updated: {new Date(gesture.updated_at).toLocaleDateString()}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Training Samples</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              {gesture.samples_count}
            </div>
          </div>
        </div>

        {error && (
          <div className="form-error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#6ee7b7', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Gesture Identifier Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Meaning / Description</label>
            <input
              type="text"
              className="form-input"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Speech Text</label>
            <input
              type="text"
              className="form-input"
              value={speechText}
              onChange={(e) => setSpeechText(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Gesture Type</label>
            <select
              className="form-select"
              value={gestureType}
              onChange={(e) => setGestureType(e.target.value as GestureType)}
            >
              <option value="ONE_HAND">ONE HAND (Single Hand Landmark Tracking)</option>
              <option value="TWO_HANDS">TWO HANDS (Bimanual Gesture Tracking)</option>
              <option value="HAND_OBJECT">HAND + OBJECT (Hand Interacting with Object)</option>
            </select>
          </div>

          {gestureType === 'HAND_OBJECT' && (
            <div className="form-group">
              <label className="form-label">Object Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Bottle, Pen"
                value={objectName}
                onChange={(e) => setObjectName(e.target.value)}
                required={gestureType === 'HAND_OBJECT'}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <DeleteModal
        isOpen={showDeleteModal}
        title={`Delete Gesture "${gesture.name}"?`}
        message="Are you sure you want to permanently delete this gesture? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        isDeleting={isDeleting}
      />
    </div>
  );
};
