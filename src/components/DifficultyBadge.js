import React from 'react';

export default function DifficultyBadge({ difficulty }) {
  const diff = (difficulty || '').toString().toLowerCase();
  const classes =
    diff === 'basic'
      ? 'bg-green-100 text-green-700'
      : diff === 'medium'
      ? 'bg-yellow-100 text-yellow-700'
      : diff === 'advanced'
      ? 'bg-red-100 text-red-700'
      : 'bg-gray-200 text-gray-700';

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${classes}`}>
      {difficulty}
    </span>
  );
}
