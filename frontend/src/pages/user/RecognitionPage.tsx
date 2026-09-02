import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gestureService, ActiveModelInfo } from '../../services/gestureService';
import { recognitionService } from '../../services/recognitionService';
import { RecognitionLogItem } from '../../types';
import {
  Radio,
  Play,
  Square,
  Volume2,
  Cpu,
  Sliders,
  AlertCircle,
  Video,
  Clock,
  CheckCircle,
  Wifi,
  WifiOff
} from 'lucide-react';

export const RecognitionPage: React.FC = () => {
  const navigate = useNavigate();

  const [activeModel, setActiveModel] = useState<ActiveModelInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Recognition WebSocket state
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [frameSrc, setFrameSrc] = useState<string>('');
  const [detectedGesture, setDetectedGesture] = useState<string>('UNKNOWN');
  const [confidence, setConfidence] = useState<number>(0);
  const [meaning, setMeaning] = useState<string>('');
  const [speechText, setSpeechText] = useState<string>('');
  const [fps, setFps] = useState<number>(0);
  const [handCount, setHandCount] = useState<number>(0);
  const [threshold, setThreshold] = useState<number>(85); // 85% default

  // Connection state
  const [connStatus, setConnStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING'>('DISCONNECTED');
  const [wsError, setWsError] = useState<string | null>(null);

  // User's Personal Recognition History
  const [personalLogs, setPersonalLogs] = useState<RecognitionLogItem[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const fetchModelAndLogs = async () => {
    try {
      setLoading(true);
      const [mData, logsData] = await Promise.all([
        gestureService.getActiveModel(),
        recognitionService.getMyLogs(10),
      ]);
      setActiveModel(mData);
      setPersonalLogs(logsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelAndLogs();
  }, []);

  const startRecognition = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const token = localStorage.getItem('gestureai_token');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.port === "5173" ? `${window.location.hostname}:8000` : window.location.host;
    const wsUrl = `${protocol}//${host}/ws/recognition?token=${token}`;

    setConnStatus('RECONNECTING');
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnStatus('CONNECTED');
      setWsError(null);
      setIsRecognizing(true);
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

        // Confidence threshold gating
        if (data.confidence >= threshold && data.gesture !== 'UNKNOWN') {
          setDetectedGesture(data.gesture);
          setConfidence(data.confidence);
          setMeaning(data.meaning);
          setSpeechText(data.speech_text);

          // Periodically refresh personal log history
          if (Math.random() < 0.15) {
            recognitionService.getMyLogs(10).then((logs) => setPersonalLogs(logs)).catch(() => {});
          }
        } else {
          setDetectedGesture('UNKNOWN');
          setConfidence(data.confidence);
          setMeaning('');
          setSpeechText('');
        }

        setFps(data.fps);
        setHandCount(data.hand_count);
      } catch (err) {
        console.error('Recognition WS parse error', err);
      }
    };

    ws.onerror = () => {
      setWsError('Recognition connection error. Please verify webcam access and backend server status.');
      setConnStatus('DISCONNECTED');
      setIsRecognizing(false);
    };

    ws.onclose = () => {
      setConnStatus('DISCONNECTED');
      setIsRecognizing(false);
    };
  };

  const stopRecognition = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsRecognizing(false);
    setConnStatus('DISCONNECTED');
    setFrameSrc('');
    setDetectedGesture('UNKNOWN');
    setConfidence(0);
    // Refresh log table
    recognitionService.getMyLogs(10).then((logs) => setPersonalLogs(logs)).catch(() => {});
  };

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#fff' }}>
            Real-Time Gesture Recognition & Offline Speech
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Live webcam landmark inference using your personal machine learning model
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Connection Status Badge */}
          <span className={`badge ${
            connStatus === 'CONNECTED'
              ? 'badge-emerald'
              : connStatus === 'RECONNECTING'
              ? 'badge-amber'
              : 'badge-gray'
          }`}>
            {connStatus === 'CONNECTED' ? <Wifi size={12} /> : <WifiOff size={12} />}
            {connStatus}
          </span>

          {activeModel?.has_active_model ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: '#111827', padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-highlight)' }}>
              <Cpu size={16} style={{ color: 'var(--accent-emerald)' }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                {activeModel.version} ({activeModel.accuracy}% Acc)
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-md)' }}>
              <AlertCircle size={16} style={{ color: 'var(--accent-amber)' }} />
              <span style={{ fontSize: '0.82rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
                No active model. Train in Training Hub.
              </span>
            </div>
          )}
        </div>
      </div>

      {wsError && (
        <div className="form-error-banner" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{wsError}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '1.5rem', alignItems: 'start', marginBottom: '2rem' }}>
        {/* Left Column: Live Webcam Viewport & Toggle Button */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Radio size={18} style={{ color: isRecognizing ? 'var(--accent-emerald)' : 'var(--text-muted)' }} />
              <h2 className="card-title">Live Vision Stream</h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span className={`badge ${handCount > 0 ? 'badge-emerald' : 'badge-gray'}`}>
                {handCount > 0 ? `${handCount} Hand${handCount > 1 ? 's' : ''} Tracked` : 'No Hands'}
              </span>
              <span className="badge badge-cyan">FPS: {fps}</span>
            </div>
          </div>

          <div style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '4/3',
            background: '#070a12',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            border: `2px solid ${isRecognizing ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`,
            boxShadow: isRecognizing ? '0 0 25px rgba(16, 185, 129, 0.25)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}>
            {frameSrc ? (
              <img
                src={frameSrc}
                alt="Real-Time Recognition Feed"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                <Video size={54} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
                <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.35rem' }}>Camera Standby</h3>
                <p style={{ fontSize: '0.88rem' }}>Click START RECOGNITION below to start camera and speech output</p>
              </div>
            )}
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            {!isRecognizing ? (
              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', fontSize: '1.05rem', background: 'linear-gradient(135deg, var(--accent-emerald), #059669)' }}
                onClick={startRecognition}
              >
                <Play size={20} /> START RECOGNITION
              </button>
            ) : (
              <button
                className="btn btn-danger"
                style={{ width: '100%', padding: '0.85rem', fontSize: '1.05rem' }}
                onClick={stopRecognition}
              >
                <Square size={20} /> STOP RECOGNITION
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Prediction HUD, Speech Output & Confidence Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Main Detected Gesture Card */}
          <div className="card" style={{
            background: detectedGesture !== 'UNKNOWN'
              ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(139, 92, 246, 0.1))'
              : 'var(--bg-card)',
            border: detectedGesture !== 'UNKNOWN'
              ? '1px solid rgba(6, 182, 212, 0.4)'
              : '1px solid var(--border-subtle)',
            transition: 'all 0.3s ease'
          }}>
            <div className="card-header">
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700 }}>
                Live Prediction
              </span>
              <span className={`badge ${detectedGesture !== 'UNKNOWN' ? 'badge-cyan' : 'badge-gray'}`}>
                {detectedGesture !== 'UNKNOWN' ? 'MATCH' : 'SEARCHING'}
              </span>
            </div>

            <div style={{ margin: '1rem 0', textAlign: 'center' }}>
              <div style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: detectedGesture !== 'UNKNOWN' ? '#fff' : 'var(--text-muted)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1
              }}>
                {detectedGesture}
              </div>

              {meaning && (
                <p style={{ color: 'var(--accent-cyan)', fontSize: '1rem', marginTop: '0.5rem', fontWeight: 500 }}>
                  "{meaning}"
                </p>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Prediction Confidence</span>
                <span style={{ fontWeight: 700, color: confidence >= threshold ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                  {confidence.toFixed(1)}%
                </span>
              </div>
              <div style={{ height: '8px', background: '#1e293b', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, confidence)}%`,
                    background: confidence >= threshold
                      ? 'linear-gradient(90deg, var(--accent-cyan), var(--accent-emerald))'
                      : 'var(--text-muted)',
                    transition: 'width 0.2s ease'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Speech Engine Status */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Volume2 size={18} style={{ color: 'var(--accent-emerald)' }} />
                <h3 className="card-title" style={{ fontSize: '1.05rem' }}>Windows Speech Engine</h3>
              </div>
              <span className="badge badge-emerald">Offline SAPI</span>
            </div>

            <div className="gesture-info-row">
              <span>Last Spoken Word</span>
              <span style={{ color: '#fff', fontStyle: 'italic', fontWeight: 600 }}>
                {speechText ? `"${speechText}"` : 'â€”'}
              </span>
            </div>

            <div className="gesture-info-row">
              <span>Duplicate Suppression</span>
              <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>Active (2.0s Cooldown)</span>
            </div>
          </div>

          {/* Confidence Threshold Configuration */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={18} style={{ color: 'var(--accent-cyan)' }} />
                <h3 className="card-title" style={{ fontSize: '1.05rem' }}>Confidence Gate</h3>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{threshold}%</span>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
              Predictions with confidence below {threshold}% will display as UNKNOWN and will not trigger offline voice synthesis.
            </p>

            <input
              type="range"
              min="50"
              max="98"
              step="1"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
            />
          </div>
        </div>
      </div>

      {/* Personal Recognition History Table */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} style={{ color: 'var(--accent-cyan)' }} />
            <h3 className="card-title">My Recent Recognition History</h3>
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Latest {personalLogs.length} events
          </span>
        </div>

        {personalLogs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '1rem 0' }}>
            No recognition history recorded yet. Start live recognition and perform your gestures to record events.
          </p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Recognized Gesture</th>
                  <th>Confidence</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {personalLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{log.id}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#fff' }}>{log.gesture_name}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: log.confidence >= 85 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                        {log.confidence.toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {new Date(log.recognized_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
