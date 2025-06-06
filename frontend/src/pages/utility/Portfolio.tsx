import React from 'react';

const Portfolio: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-4">Plant Portfolio</h1>
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <p className="text-gray-300">
          Detailed portfolio management interface will be implemented here.
          This will show all plants, their operational status, maintenance schedules, and performance metrics.
        </p>
      </div>
    </div>
  );
};

export default Portfolio;