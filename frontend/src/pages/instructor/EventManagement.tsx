import React from 'react';

const EventManagement: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-4">Event Management</h1>
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <p className="text-gray-300">
          Market event management interface will be implemented here.
          This will allow triggering weather events, fuel shocks, plant outages, and regulatory changes.
        </p>
      </div>
    </div>
  );
};

export default EventManagement;