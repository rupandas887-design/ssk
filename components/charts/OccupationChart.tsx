
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Occupation, Member } from '../../types';

interface OccupationChartProps {
    members: Member[];
}

const OccupationChart: React.FC<OccupationChartProps> = ({ members }) => {
    const occupationCounts = members.reduce((acc, member) => {
        acc[member.occupation] = (acc[member.occupation] || 0) + 1;
        return acc;
    }, {} as Record<Occupation, number>);

    const data = Object.entries(occupationCounts).map(([name, value]) => ({ name, value }));
    
    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" stroke="#9ca3af" />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" width={80} />
                    <Tooltip cursor={{fill: 'rgba(255,128,66,0.1)'}} contentStyle={{backgroundColor: '#1f2937', border: '1px solid #374151'}}/>
                    <Legend />
                    <Bar dataKey="value" name="Members" fill="#FF8042" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default OccupationChart;