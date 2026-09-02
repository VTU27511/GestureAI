import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { gestureService, ActiveModelInfo } from '../../services/gestureService';
import { Gesture } from '../../types';
import { StatusBadge, GestureTypeBadge } from '../../components/StatusBadge';
import {
  Activity,
  Play,
  Square,
  Cpu,
  RefreshCw,
  Video,
  AlertCircle,
  CheckCircle2,
  Trash2
} from 'lucide-react';

export const TrainingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const selectedGestureId = searchParams.get('gesture_id');
  const navigate = useNavigate();

  const [gestures, setGestures] = useState<Gesture[]>([]);
  const [activeGesture, setActiveGesture] = useState<Gesture | null>(null);
  const [activeModel, setActiveModel] = useState<ActiveModelInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Live WebSocket state
  const [isCapturing, setIsCapturing] = useState(false);
  const [frameSrc, setFrameSrc] = useState<string>('');
  const [validSamples, setValidSamples] = useState<number>(0);
  const [invalidSamples, setInvalidSamples] = useState<number>(0);
  const [currentSamples, setCurrentSamples] = useState<number>(0);
  const [handDetected, setHandDetected] = useState<string>('NOT DETECTED');
  const [fps, setFps] = useState<number>(0);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [wsError, setWsError] = useState<string | null>(null);

  // Training state
  const [isTraining, setIsTraining] = useState(false);
  const [trainSuccess, setTrainSuccess] = useState<string | null>(null);
  const [trainError, setTrainError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [gData, mData] = await Promise.all([
        gestureService.getGestures(),
        gestureService.getActiveModel(),
      ]);
      setGestures(gData);
      setActiveModel(mData);

      if (gData.length > 0) {
        const found = gData.find((g) => g.id.toString() === selectedGestureId) || gData[0];
        setActiveGesture(found);
        setCurrentSamples(found.samples_count);
      }
    } catch (err) {
      console.error('Failed to load training page data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [selectedGestureId]);

  // Establish WebSocket connection when activeGesture changes
  useEffect(() => {
    if (!activeGesture) return;

    // Close any prior socket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const token = localStorage.getItem('gestureai_token');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.port === "5173" ? `${window.location.hostname}:8000` : window.location.host; // e.g. localhost:5173 (proxied) or direct backend
    const wsUrl = `${protocol}//${host}/ws/training/${activeGesture.id}?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      setWsError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          setWsError(data.error);
          return;
        }

        if (data.frame) {
          setFrameSrc(data.frame);
        }
        setIsCapturing(data.is_capturing);
        setCurrentSamples(data.sample_count);
        setValidSamples(data.valid_samples);
        setInvalidSamples(data.invalid_samples);
        setHandDetected(data.hand_detected);
        setFps(data.fps);
      } catch (err) {
        console.error('WS parse error', err);
      }
    };

    ws.onerror = () => {
      setWsError('WebSocket connection error. Is the backend server running with webcam connected?');
      setWsConnected(false);
    };

    ws.onclose = () => {
      setWsConnected(false);
      setIsCapturing(false);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [activeGesture?.id]);

  const handleStartCapture = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'start' }));
      setIsCapturing(true);
    }
  };

  const handleStopCapture = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'stop' }));
      setIsCapturing(false);
    }
  };

  const handleTrainModel = async () => {
    setIsTraining(true);
    setTrainError(null);
    setTrainSuccess(null);

    try {
      const res = await gestureService.trainModel();
      setTrainSuccess(
        `Model ${res.version} trained successfully! Accuracy: ${res.accuracy}% (${res.sample_count} total samples)`
      );
      // Refresh active model
      const updatedModel = await gestureService.getActiveModel();
      setActiveModel(updatedModel);
      // Refresh gestures
      const updatedGestures = await gestureService.getGestures();
      setGestures(updatedGestures);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to train model.';
      setTrainError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsTraining(false);
    }
  };

  const handleClearSamples = async () => {
    if (!activeGesture) return;
    if (!window.confirm(`Reset all recorded samples for "${activeGesture.name}"?`)) return;

    try {
      await gestureService.clearSamples(activeGesture.id);
      setCurrentSamples(0);
      setValidSamples(0);
      setInvalidSamples(0);
      const updatedGestures = await gestureService.getGestures();
      setGestures(updatedGestures);
    } catch (err) {
      console.error(err);
    }
  };

  const sampleTarget = 50;
  const progressPercent = Math.min(100, Math.round((currentSamples / sampleTarget) * 100));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#fff' }}>
            Fast Automatic Gesture Capture & Training
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Collect normalized MediaPipe 3D landmark samples continuously and train custom ML models
          </p>
        </div>

        {activeModel?.has_active_model && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#111827', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-highlight)' }}>
            <Cpu size={18} style={{ color: 'var(--accent-emerald)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Model</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>
                {activeModel.version} Â· {activeModel.accuracy}% Acc
              </div>
            </div>
          </div>
        )}
      </div>

      {wsError && (
        <div className="form-error-banner" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{wsError}</span>
        </div>
      )}

      {trainSuccess && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#6ee7b7', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <CheckCircle2 size={18} />
          <span>{trainSuccess}</span>
        </div>
      )}

      {trainError && (
        <div className="form-error-banner" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{trainError}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Gesture Selector & Training Triggers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Select Gesture</h2>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => navigate('/user/gestures/create')}
              >
                + New
              </button>
            </div>

            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading gestures...</p>
            ) : gestures.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>No gestures found</p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/user/gestures/create')}>
                  Create Gesture
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '360px', overflowY: 'auto' }}>
                {gestures.map((g) => {
                  const isSelected = activeGesture?.id === g.id;
                  return (
                    <div
                      key={g.id}
                      onClick={() => setActiveGesture(g)}
                      style={{
                        padding: '0.75rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isSelected ? 'rgba(6, 182, 212, 0.12)' : '#0d131f',
                        border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: '#fff' }}>{g.name}</span>
                        <StatusBadge status={g.status} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        <span>{g.gesture_type.replace('_', ' ')}</span>
                        <span style={{ fontWeight: 600, color: isSelected ? 'var(--accent-cyan)' : 'inherit' }}>
                          {g.samples_count} samples
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Model Training Trigger Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ fontSize: '1.1rem' }}>Model Training</h3>
              <Cpu size={18} style={{ color: 'var(--accent-cyan)' }} />
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.4 }}>
              Train a lightweight Random Forest classifier using normalized 3D hand landmarks across all your gestures.
            </p>

            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem' }}
              onClick={handleTrainModel}
              disabled={isTraining || isCapturing}
            >
              <RefreshCw size={16} className={isTraining ? 'spin' : ''} />
              {isTraining ? 'Training Model...' : 'Train Model'}
            </button>
          </div>
        </div>

        {/* Right Column: Live Camera & Fast Automatic Capture */}
        {activeGesture && (
          <div className="card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h2 className="card-title" style={{ fontSize: '1.4rem' }}>{activeGesture.name}</h2>
                  <GestureTypeBadge type={activeGesture.gesture_type} objectName={activeGesture.object_name} />
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
                  Voice prompt: "{activeGesture.speech_text}"
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className={`badge ${handDetected === 'DETECTED' ? 'badge-emerald' : 'badge-rose'}`}>
                  Hand: {handDetected}
                </span>
                <span className="badge badge-cyan">
                  FPS: {fps}
                </span>
              </div>
            </div>

            {/* Live Camera Viewport */}
            <div style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4/3',
              background: '#070a12',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              border: `2px solid ${isCapturing ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
              boxShadow: isCapturing ? '0 0 25px rgba(6, 182, 212, 0.3)' : 'none',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {frameSrc ? (
                <img
                  src={frameSrc}
                  alt="Live Webcam Feed"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Video size={48} style={{ marginBottom: '0.75rem', opacity: 0.6 }} />
                  <p>Connecting to camera hardware...</p>
                </div>
              )}

              {/* In-Frame Live Capture Indicator */}
              {isCapturing && (
                <div style={{
                  position: 'absolute',
                  top: '1rem',
                  left: '1rem',
                  background: 'rgba(239, 68, 68, 0.9)',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  letterSpacing: '0.05em'
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                  FAST CONTINUOUS CAPTURE ACTIVE
                </div>
              )}
            </div>

            {/* Capture Metrics & Controls */}
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#0a0e17', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Samples</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {currentSamples}
                  </div>
                </div>

                <div style={{ background: '#0a0e17', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Valid Captured</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    {validSamples}
                  </div>
                </div>

                <div style={{ background: '#0a0e17', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Invalid Skipped</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
                    {invalidSamples}
                  </div>
                </div>

                <div style={{ background: '#0a0e17', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: isCapturing ? 'var(--accent-cyan)' : '#fff', marginTop: '4px' }}>
                    {isCapturing ? 'CAPTURING' : 'STANDBY'}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>Sample Density (Target: {sampleTarget})</span>
                  <span>{progressPercent}%</span>
                </div>
                <div style={{ height: '8px', background: '#1e293b', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${progressPercent}%`,
                      background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-emerald))',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>

              {/* Control Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {!isCapturing ? (
                  <button
                    className="btn btn-success"
                    style={{ flex: 1, padding: '0.75rem', fontSize: '1rem' }}
                    onClick={handleStartCapture}
                    disabled={!wsConnected}
                  >
                    <Play size={18} /> START CAPTURE
                  </button>
                ) : (
                  <button
                    className="btn btn-danger"
                    style={{ flex: 1, padding: '0.75rem', fontSize: '1rem' }}
                    onClick={handleStopCapture}
                  >
                    <Square size={18} /> STOP CAPTURE
                  </button>
                )}

                <button
                  className="btn btn-secondary"
                  onClick={handleClearSamples}
                  disabled={isCapturing || currentSamples === 0}
                  title="Reset recorded samples"
                >
                  <Trash2 size={16} /> Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
