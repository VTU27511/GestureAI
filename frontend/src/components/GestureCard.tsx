import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Gesture } from '../types';
import { StatusBadge, GestureTypeBadge } from './StatusBadge';
import { Play, Activity, Edit3, Trash2 } from 'lucide-react';

interface GestureCardProps {
  gesture: Gesture;
  onDelete: (gesture: Gesture) => void;
}

export const GestureCard: React.FC<GestureCardProps> = ({ gesture, onDelete }) => {
  const navigate = useNavigate();

  return (
    <div className="gesture-card">
      <div>
        <div className="gesture-card-top">
          <h3 className="gesture-card-name">{gesture.name}</h3>
          <StatusBadge status={gesture.status} />
        </div>

        <p className="gesture-card-meaning">
          {gesture.meaning}
        </p>

        <div className="gesture-info-row">
          <span>Type</span>
          <GestureTypeBadge type={gesture.gesture_type} objectName={gesture.object_name} />
        </div>

        <div className="gesture-info-row">
          <span>Speech Output</span>
          <span className="gesture-info-value" style={{ fontStyle: 'italic' }}>
            "{gesture.speech_text}"
          </span>
        </div>

        <div className="gesture-info-row">
          <span>Samples</span>
          <span className="gesture-info-value" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
            {gesture.samples_count}
          </span>
        </div>
      </div>

      <div className="gesture-card-actions">
        <button
          className="btn btn-sm btn-primary"
          style={{ flex: 1 }}
          onClick={() => navigate(`/user/training?gesture_id=${gesture.id}`)}
          title="Collect training samples for this gesture"
        >
          <Activity size={14} /> Train
        </button>

        <button
          className="btn btn-sm btn-secondary"
          style={{ flex: 1 }}
          onClick={() => navigate(`/user/recognition?gesture_id=${gesture.id}`)}
          title="Test recognition for this gesture"
        >
          <Play size={14} /> Recognize
        </button>

        <button
          className="btn btn-sm btn-secondary"
          onClick={() => navigate(`/user/gestures/${gesture.id}`)}
          title="Edit gesture details"
        >
          <Edit3 size={14} />
        </button>

        <button
          className="btn btn-sm btn-danger"
          onClick={() => onDelete(gesture)}
          title="Delete gesture"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
