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
  WifiOff,
  Sparkles,
  Globe
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
  const [teluguText, setTeluguText] = useState<string>('');
  const [tamilText, setTamilText] = useState<string>('');
  const [fps, setFps] = useState<number>(0);
  const [handCount, setHandCount] = useState<number>(0);
  const [threshold, setThreshold] = useState<number>(65); // 65% optimal default for fast, accurate recognition

  // Voice Language Preference (Telugu, Tamil, English)
  const [voiceLanguage, setVoiceLanguage] = useState<'te' | 'ta' | 'en'>('te');
  // Voice Gender Preference (Female / Male)
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  // Connection state
  const [connStatus, setConnStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING'>('DISCONNECTED');
  const [wsError, setWsError] = useState<string | null>(null);

  // User's Personal Recognition History
  const [personalLogs, setPersonalLogs] = useState<RecognitionLogItem[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const playAudio = (audioBase64?: string, fallbackUrl?: string) => {
    try {
      if (audioBase64) {
        const audio = new Audio(audioBase64);
        audio.play().catch((e) => console.warn('Browser audio playback prevented or deferred:', e));
        return;
      }
      if (fallbackUrl) {
        const audio = new Audio(fallbackUrl);
        audio.play().catch((e) => console.warn('Browser audio stream error:', e));
      }
    } catch (err) {
      console.error('Audio play error:', err);
    }
  };

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

  const handleLanguageChange = (lang: 'te' | 'ta' | 'en') => {
    setVoiceLanguage(lang);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'set_language', language: lang }));
    }
  };

  const handleGenderChange = (gender: 'female' | 'male') => {
    setVoiceGender(gender);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'set_gender', gender }));
    }
  };

  const handleThresholdChange = (val: number) => {
    setThreshold(val);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'set_threshold', threshold: val }));
    }
  };

  const testVoice = async () => {
    setIsTestingVoice(true);
    const phrases: Record<string, string> = {
      te: 'నమస్కారం! గెస్చర్ ఏఐ తెలుగు వాయిస్ అద్భుతంగా పనిచేస్తోంది.',
      ta: 'வணக்கம்! கெஸ்ச்சர் ஏஐ தமிழ் குரல் சிறப்பாக செயல்படுகிறது.',
      en: 'Hello! GestureAI speech synthesis is working properly.'
    };
    const phrase = phrases[voiceLanguage] || phrases.te;

    try {
      const res = await recognitionService.testSpeech(phrase, voiceLanguage, voiceGender);
      if (res && res.audio_base64) {
        playAudio(res.audio_base64);
      } else {
        const streamUrl = recognitionService.getAudioStreamUrl(phrase, voiceLanguage, voiceGender);
        playAudio(undefined, streamUrl);
      }
    } catch (err) {
      console.error('Test speech error', err);
      const streamUrl = recognitionService.getAudioStreamUrl(phrase, voiceLanguage, voiceGender);
      playAudio(undefined, streamUrl);
    } finally {
      setTimeout(() => setIsTestingVoice(false), 1200);
    }
  };

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
      // Configure voice settings & threshold
      ws.send(JSON.stringify({ action: 'set_language', language: voiceLanguage }));
      ws.send(JSON.stringify({ action: 'set_gender', gender: voiceGender }));
      ws.send(JSON.stringify({ action: 'set_threshold', threshold }));
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
          setTeluguText(data.telugu_text || '');
          setTamilText(data.tamil_text || '');

          // Play synthesized audio directly through browser speakers
          if (data.audio_base64) {
            playAudio(data.audio_base64);
          }

          // Periodically refresh personal log history
          if (Math.random() < 0.15) {
            recognitionService.getMyLogs(10).then((logs) => setPersonalLogs(logs)).catch(() => {});
          }
        } else {
          setDetectedGesture('UNKNOWN');
          setConfidence(data.confidence);
          setMeaning('');
          setSpeechText('');
          setTeluguText('');
          setTamilText('');
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
    setTeluguText('');
    setSpeechText('');
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
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Live Gesture Recognition</h1>
          <p className="page-subtitle">
            Continuous real-time MediaPipe computer vision inference with fluent Telugu voice synthesis
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                <p style={{ fontSize: '0.88rem' }}>Click START RECOGNITION below to begin live camera detection and Telugu voice</p>
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

        {/* Right Column: Prediction HUD, Fluent Telugu Speech & Controls */}
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

          {/* Fluent Voice Engine Status Card (Telugu & English) */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Volume2 size={18} style={{ color: 'var(--accent-emerald)' }} />
                <h3 className="card-title" style={{ fontSize: '1.05rem' }}>Voice Speech Engine</h3>
              </div>
              <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={11} /> {voiceLanguage === 'te' ? 'Telugu' : voiceLanguage === 'ta' ? 'Tamil' : 'English'} ({voiceGender === 'female' ? '👩 Female' : '👨 Male'})
              </span>
            </div>

            {/* Language Selector Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.65rem' }}>
              <button
                type="button"
                className={`btn btn-sm ${voiceLanguage === 'te' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                  padding: '0.45rem 0.35rem',
                  background: voiceLanguage === 'te' ? 'linear-gradient(135deg, #10b981, #059669)' : undefined,
                  borderColor: voiceLanguage === 'te' ? '#10b981' : undefined
                }}
                onClick={() => handleLanguageChange('te')}
              >
                <span style={{ fontSize: '1rem' }}>🇮🇳</span>
                <span style={{ fontWeight: 700 }}>తెలుగు</span>
              </button>

              <button
                type="button"
                className={`btn btn-sm ${voiceLanguage === 'ta' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                  padding: '0.45rem 0.35rem',
                  background: voiceLanguage === 'ta' ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : undefined,
                  borderColor: voiceLanguage === 'ta' ? '#8b5cf6' : undefined
                }}
                onClick={() => handleLanguageChange('ta')}
              >
                <span style={{ fontSize: '1rem' }}>🇮🇳</span>
                <span style={{ fontWeight: 700 }}>தமிழ்</span>
              </button>

              <button
                type="button"
                className={`btn btn-sm ${voiceLanguage === 'en' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                  padding: '0.45rem 0.35rem',
                  background: voiceLanguage === 'en' ? 'linear-gradient(135deg, #06b6d4, #0284c7)' : undefined,
                  borderColor: voiceLanguage === 'en' ? '#06b6d4' : undefined
                }}
                onClick={() => handleLanguageChange('en')}
              >
                <span style={{ fontSize: '1rem' }}>🇬🇧</span>
                <span style={{ fontWeight: 600 }}>English</span>
              </button>
            </div>

            {/* Voice Gender Switcher (Female / Male) */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
              <button
                type="button"
                className={`btn btn-sm ${voiceGender === 'female' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  fontSize: '0.82rem',
                  padding: '0.4rem',
                  background: voiceGender === 'female' ? 'linear-gradient(135deg, #ec4899, #db2777)' : undefined,
                  borderColor: voiceGender === 'female' ? '#ec4899' : undefined
                }}
                onClick={() => handleGenderChange('female')}
              >
                <span>👩</span>
                <span style={{ fontWeight: 700 }}>Female Voice</span>
              </button>

              <button
                type="button"
                className={`btn btn-sm ${voiceGender === 'male' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  fontSize: '0.82rem',
                  padding: '0.4rem',
                  background: voiceGender === 'male' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : undefined,
                  borderColor: voiceGender === 'male' ? '#3b82f6' : undefined
                }}
                onClick={() => handleGenderChange('male')}
              >
                <span>👨</span>
                <span style={{ fontWeight: 700 }}>Male Voice</span>
              </button>
            </div>

            {/* Live Fluent Speech Output Box */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                fontSize: '0.74rem',
                color: voiceLanguage === 'ta' ? 'var(--accent-purple)' : voiceLanguage === 'en' ? 'var(--accent-cyan)' : 'var(--accent-emerald)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '0.35rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <Globe size={13} />
                {voiceLanguage === 'te'
                  ? 'Fluent Telugu Speech Output (తెలుగు)'
                  : voiceLanguage === 'ta'
                  ? 'Fluent Tamil Speech Output (தமிழ்)'
                  : 'English Speech Output'} ({voiceGender === 'female' ? 'Female' : 'Male'})
              </div>

              <div style={{
                fontSize: voiceLanguage !== 'en' ? '1.35rem' : '1.15rem',
                fontWeight: 800,
                color: '#ffffff',
                minHeight: '2rem',
                lineHeight: 1.35,
                textShadow: '0 0 12px rgba(16, 185, 129, 0.4)'
              }}>
                {voiceLanguage === 'te'
                  ? (teluguText ? `"${teluguText}"` : 'సంజ్ఞ కోసం వేచి చూస్తోంది...')
                  : voiceLanguage === 'ta'
                  ? (tamilText ? `"${tamilText}"` : 'சைகைக்காக காத்திருக்கிறது...')
                  : (speechText ? `"${speechText}"` : 'Waiting for gesture...')}
              </div>

              {voiceLanguage !== 'en' && speechText && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '0.35rem' }}>
                  English: "{speechText}"
                </div>
              )}
            </div>

            {/* Speech Controls & Test Button */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  fontSize: '0.86rem',
                  padding: '0.55rem 1rem'
                }}
                onClick={testVoice}
                disabled={isTestingVoice}
              >
                <Volume2 size={16} style={{ color: 'var(--accent-emerald)' }} />
                <span>
                  {isTestingVoice
                    ? (voiceLanguage === 'te' ? 'వాయిస్ ప్లే అవుతోంది...' : voiceLanguage === 'ta' ? 'குரல் ஒலிக்கிறது...' : 'Playing voice...')
                    : (voiceLanguage === 'te'
                        ? `🔊 Test Telugu ${voiceGender === 'female' ? 'Female (స్త్రీ)' : 'Male (పురుష)'} Voice`
                        : voiceLanguage === 'ta'
                        ? `🔊 Test Tamil ${voiceGender === 'female' ? 'Female (பெண்)' : 'Male (ஆண்)'} Voice`
                        : `🔊 Test English ${voiceGender === 'female' ? 'Female' : 'Male'} Voice`)}
                </span>
              </button>
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
              Optimized at 60-70% for real-time responsiveness. Predictions below {threshold}% display as UNKNOWN.
            </p>

            <input
              type="range"
              min="40"
              max="95"
              step="1"
              value={threshold}
              onChange={(e) => handleThresholdChange(Number(e.target.value))}
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
            <h2 className="card-title">My Recent Recognitions</h2>
          </div>
          <span className="badge badge-gray">{personalLogs.length} Records</span>
        </div>

        {personalLogs.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
            <p>No recent recognition events recorded yet. Start camera detection above!</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Detected Gesture</th>
                  <th>Confidence</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {personalLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {new Date(log.recognized_at).toLocaleTimeString()}
                    </td>
                    <td>
                      <span className="badge badge-cyan">{log.gesture_name}</span>
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 600,
                        color: log.confidence >= 85 ? 'var(--accent-emerald)' : 'var(--accent-amber)'
                      }}>
                        {log.confidence.toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-emerald">Recognized</span>
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
