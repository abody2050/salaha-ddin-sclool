
import React from 'react';

interface Stat {
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

export const DashboardStats: React.FC<{ stats: Stat[] }> = ({ stats }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, i) => (
        <div key={i} className={`p-6 rounded-2xl border ${colors[stat.color]} shadow-sm`}>
          <p className="text-sm font-medium opacity-80 mb-1">{stat.label}</p>
          <div className="flex items-end justify-between">
            <h4 className="text-2xl font-bold">{stat.value}</h4>
            {stat.change && (
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                stat.isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {stat.change}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
