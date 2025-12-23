
import React from 'react';
import { Award } from 'lucide-react';
import Card from './ui/Card';

// Fix: Define mock data locally since `data.ts` is removed.
const MOCK_REWARDS = [
  { title: 'Top Enroller of the Week', winner: 'Anil Kumar', achievement: '35 New Members' },
  { title: 'Organisation of the Week', winner: 'SSK Hubli', achievement: '150 New Members' },
];


const Rewards: React.FC = () => {
    return (
        <Card>
            <h2 className="text-3xl font-cinzel text-center text-orange-500 mb-6">Weekly Rewards</h2>
            <div className="grid md:grid-cols-2 gap-6 text-center">
                {MOCK_REWARDS.map((reward, index) => (
                    <div key={index} className="p-6 bg-gray-800 rounded-lg border border-orange-700">
                        <Award className="mx-auto text-yellow-400 mb-2" size={40} />
                        <h3 className="font-cinzel text-xl text-white">{reward.title}</h3>
                        <p className="text-2xl font-bold text-orange-400 mt-2">{reward.winner}</p>
                        <p className="text-gray-400">{reward.achievement}</p>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default Rewards;