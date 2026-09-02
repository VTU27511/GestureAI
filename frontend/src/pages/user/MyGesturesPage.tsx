import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gestureService } from '../../services/gestureService';
import { Gesture, GestureType } from '../../types';
import { GestureCard } from '../../components/GestureCard';
import { DeleteModal } from '../../components/DeleteModal';
import { PlusCircle, Search, Layers, Filter } from 'lucide-react';

export const MyGesturesPage: React.FC = () => {
  const navigate = useNavigate();

  const [gestures, setGestures] = useState<Gesture[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [deleteTarget, setDeleteTarget] = useState<Gesture | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchGestures = async () => {
    try {
      setLoading(true);
      const data = await gestureService.getGestures();
      setGestures(data);
    } catch (err) {
      console.error('Failed to load gestures', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGestures();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await gestureService.deleteGesture(deleteTarget.id);
      setDeleteTarget(null);
      await fetchGestures();
    } catch (err) {
      console.error('Failed to delete gesture', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredGestures = gestures.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.meaning.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.speech_text.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'ALL' || g.gesture_type === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#fff' }}>
            My Gestures
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Manage and train your personal custom gesture catalog ({gestures.length} total)
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => navigate('/user/gestures/create')}
        >
          <PlusCircle size={18} /> Create New Gesture
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.75rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
            <Search size={18} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ border: 'none', background: 'transparent', padding: '0.4rem 0' }}
              placeholder="Search gestures by name, meaning, or speech phrase..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              className="form-select"
              style={{ width: 'auto', padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Gesture Types</option>
              <option value="ONE_HAND">One Hand</option>
              <option value="TWO_HANDS">Two Hands</option>
              <option value="HAND_OBJECT">Hand + Object</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gesture Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading your gestures...
        </div>
      ) : filteredGestures.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
          <Layers size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
            {searchQuery || typeFilter !== 'ALL'
              ? 'No gestures match your filter criteria'
              : 'You haven\'t created any gestures yet'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {searchQuery || typeFilter !== 'ALL'
              ? 'Try clearing the search query or selecting "All Gesture Types"'
              : 'Create custom hand gestures with personalized voice and detection settings'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/user/gestures/create')}
          >
            <PlusCircle size={18} /> Create Custom Gesture
          </button>
        </div>
      ) : (
        <div className="gestures-grid">
          {filteredGestures.map((gesture) => (
            <GestureCard
              key={gesture.id}
              gesture={gesture}
              onDelete={(g) => setDeleteTarget(g)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={!!deleteTarget}
        title={`Delete Gesture "${deleteTarget?.name}"?`}
        message="Are you sure you want to delete this custom gesture? All associated training samples, sessions, and models will be permanently removed."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
};
