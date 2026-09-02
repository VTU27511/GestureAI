import React from 'react';
import { GestureType } from '../types';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status.toUpperCase();

  let badgeClass = 'badge-gray';
  if (normalized === 'TRAINED' || normalized === 'COMPLETED' || normalized === 'ACTIVE') {
    badgeClass = 'badge-emerald';
  } else if (normalized === 'TRAINING' || normalized === 'IN_PROGRESS') {
    badgeClass = 'badge-amber';
  } else if (normalized === 'SAMPLES READY') {
    badgeClass = 'badge-cyan';
  } else if (normalized === 'FAILED' || normalized === 'INACTIVE') {
    badgeClass = 'badge-rose';
  } else if (normalized === 'NOT TRAINED') {
    badgeClass = 'badge-gray';
  }

  return <span className={`badge ${badgeClass}`}>{status}</span>;
};

interface GestureTypeBadgeProps {
  type: GestureType;
  objectName?: string | null;
}

export const GestureTypeBadge: React.FC<GestureTypeBadgeProps> = ({ type, objectName }) => {
  if (type === 'ONE_HAND') {
    return <span className="badge badge-cyan">ONE HAND</span>;
  }
  if (type === 'TWO_HANDS') {
    return <span className="badge badge-violet">TWO HANDS</span>;
  }
  return (
    <span className="badge badge-amber">
      HAND + {objectName ? objectName.toUpperCase() : 'OBJECT'}
    </span>
  );
};
