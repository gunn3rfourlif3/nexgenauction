import React from 'react';

const RegistrationBadge: React.FC<{ status?: 'registered' | 'pending' | 'not_registered' }> = ({ status = 'not_registered' }) => {
  const map = {
    registered: { text: 'Registered', className: 'bg-green-100 text-green-800' },
    pending: { text: 'Pending Approval', className: 'bg-yellow-100 text-yellow-800' },
    not_registered: { text: 'Not Registered', className: 'bg-gray-100 text-gray-800' },
  };
  const cfg = map[status] || map.not_registered;
  return <span className={`px-2 py-1 rounded text-xs font-medium ${cfg.className}`}>{cfg.text}</span>;
};

export default RegistrationBadge;
