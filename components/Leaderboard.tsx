
import React from 'react';
import Card from './ui/Card';
import { Trophy, Shield } from 'lucide-react';
import { Volunteer, Organisation, Member } from '../types';

interface LeaderboardProps {
    volunteers: Volunteer[];
    organisations: Organisation[];
    members: Member[];
}

const Leaderboard: React.FC<LeaderboardProps> = ({ volunteers, organisations, members }) => {
  const topVolunteers = [...volunteers]
    .sort((a, b) => b.enrollments - a.enrollments)
    .slice(0, 5);

  const orgEnrollments = members.reduce((acc, member) => {
    // Fix: Use snake_case `organisation_id` to match database schema
    acc[member.organisation_id] = (acc[member.organisation_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topOrganisations = [...organisations]
    .map(org => ({ ...org, enrollments: orgEnrollments[org.id] || 0 }))
    .sort((a, b) => b.enrollments - a.enrollments)
    .slice(0, 5);

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card title="Top Volunteers">
        <ul className="space-y-4">
          {topVolunteers.map((volunteer, index) => (
            <li key={volunteer.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
              <div className="flex items-center space-x-3">
                <Trophy className={index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-yellow-600' : 'text-orange-500'} />
                <span className="font-semibold">{volunteer.name}</span>
              </div>
              <span className="text-lg font-bold text-orange-400">{volunteer.enrollments}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Top Organisations">
        <ul className="space-y-4">
          {topOrganisations.map((org, index) => (
            <li key={org.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
              <div className="flex items-center space-x-3">
                <Shield className={index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-yellow-600' : 'text-orange-500'} />
                <span className="font-semibold">{org.name}</span>
              </div>
              <span className="text-lg font-bold text-orange-400">{org.enrollments}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};

export default Leaderboard;