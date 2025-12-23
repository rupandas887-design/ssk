
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { SupportNeed, Member } from '../../types';

interface SupportChartProps {
    members: Member[];
}

const SupportChart: React.FC<SupportChartProps> = ({ members }) => {
    const supportCounts = members.reduce((acc, member) => {
        // Fix: Use snake_case `support_need` to match the database schema.
        acc[member.support_need] = (acc[member.support_need] || 0) + 1;
        return acc;
    }, {} as Record<SupportNeed, number>);

    const data = Object.entries(supportCounts).map(([name, value]) => ({ name, value }));

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" angle={-30} textAnchor="end" height={70} />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip cursor={{fill: 'rgba(255,128,66,0.1)'}} contentStyle={{backgroundColor: '#1f2937', border: '1px solid #374151'}} />
                    <Legend />
                    <Bar dataKey="value" name="Requests" fill="#FF8042" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default SupportChart;