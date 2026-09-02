import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gestureService } from '../../services/gestureService';
import { GestureType } from '../../types';
import { PlusCircle, ArrowLeft, AlertCircle } from 'lucide-react';

export const CreateGesturePage: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [meaning, setMeaning] = useState('');
  const [speechText, setSpeechText] = useState('');
  const [gestureType, setGestureType] = useState<GestureType>('ONE_HAND');
  const [objectName, setObjectName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (gestureType === 'HAND_OBJECT' && !objectName.trim()) {
      setError('Object Name is required when gesture type is "HAND + OBJECT".');
      return;
    }

    setLoading(true);

    try {
      await gestureService.createGesture({
        name: name.trim().toUpperCase(),
        meaning: meaning.trim(),
        speech_text: speechText.trim(),
        gesture_type: gestureType,
        object_name: gestureType === 'HAND_OBJECT' ? objectName.trim() : null,
      });

      // Redirect to My Gestures
      navigate('/user/gestures');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to create gesture. Please try again.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <button
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: '1.5rem' }}
        onClick={() => navigate('/user/gestures')}
      >
        <ArrowLeft size={16} /> Back to My Gestures
      </button>

      <div className="card">
        <div className="card-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h1 className="card-title" style={{ fontSize: '1.4rem' }}>
              Create Custom Gesture
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
              Define a custom gesture label, voice trigger, and detection mode
            </p>
          </div>
        </div>

        {error && (
          <div className="form-error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Gesture Name */}
          <div className="form-group">
            <label className="form-label">Gesture Identifier Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. HELLO, THUMBS_UP, OPEN_PALM"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
            <div className="form-helper">
              Unique label for ML training classification. Automatically stored in uppercase.
            </div>
          </div>

          {/* Meaning */}
          <div className="form-group">
            <label className="form-label">Meaning / Description *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Friendly greeting gesture with open hand"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              required
            />
            <div className="form-helper">
              Human-readable definition of the gesture intent.
            </div>
          </div>

          {/* Speech Text */}
          <div className="form-group">
            <label className="form-label">Speech Text *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Hello, how are you today?"
              value={speechText}
              onChange={(e) => setSpeechText(e.target.value)}
              required
            />
            <div className="form-helper">
              The exact phrase spoken aloud by the voice engine upon successful recognition.
            </div>
          </div>

          {/* Gesture Type */}
          <div className="form-group">
            <label className="form-label">Gesture Type *</label>
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

          {/* Object Name (Conditional) */}
          {gestureType === 'HAND_OBJECT' && (
            <div className="form-group" style={{ animation: 'fadeIn 0.3s ease' }}>
              <label className="form-label">Object Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Bottle, Pen, Cup, Book"
                value={objectName}
                onChange={(e) => setObjectName(e.target.value)}
                required={gestureType === 'HAND_OBJECT'}
              />
              <div className="form-helper">
                Specify the physical object being detected alongside the hand gesture.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/user/gestures')}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              <PlusCircle size={18} /> {loading ? 'Saving...' : 'Create Gesture'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
