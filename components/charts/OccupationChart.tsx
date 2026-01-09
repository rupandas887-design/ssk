
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Occupation, Member } from '../../types';

interface OccupationChartProps {
    members: Member[];
}

const OccupationChart: React.FC<OccupationChartProps> = ({ members }) => {
    // Initialize all categories
    const occupationCounts = Object.values(Occupation).reduce((acc, occ) => {
        acc[occ] = 0;
        return acc;
    }, {} as Record<string, number>);

    members.forEach(member => {
        const occ = member.occupation || (member as any).occupation;
        if (occ && occupationCounts[occ] !== undefined) {
            occupationCounts[occ]++;
        }
    });

    const data = Object.entries(occupationCounts).map(([name, value]) => ({ name, value }));
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CFE', '#FE8C8C', '#8CFE8C'];

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" horizontal={false} />
                    <XAxis type="number" stroke="#4b5563" fontSize={10} hide />
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke="#9ca3af" 
                        fontSize={10} 
                        width={80}
                        tick={{ fill: '#9ca3af', fontWeight: 'bold' }}
                    />
                    <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                        contentStyle={{ 
                            backgroundColor: '#0a0a0a', 
                            border: '1px solid #333', 
                            borderRadius: '8px',
                            color: '#fff'
                        }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="value" name="Members" radius={[0, 4, 4, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default OccupationChart;
