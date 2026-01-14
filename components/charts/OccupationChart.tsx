import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Occupation, Member } from '../../types';

interface OccupationChartProps {
    members: Member[];
}

const OccupationChart: React.FC<OccupationChartProps> = ({ members }) => {
    const occupationCounts = Object.values(Occupation).reduce((acc, occ) => {
        acc[occ] = 0;
        return acc;
    }, {} as Record<string, number>);

    members.forEach(member => {
        const occ = member.occupation;
        if (occ && occupationCounts[occ] !== undefined) occupationCounts[occ]++;
    });

    const data = Object.entries(occupationCounts).map(([name, value]) => ({ name, value }));
    
    // Expanded multi-color palette for 10 items
    const COLORS = [
      '#008CFF', '#00C9A7', '#FFCC00', '#FF7E00', '#9D70FF', 
      '#FF7070', '#50E3C2', '#F48FB1', '#81C784', '#BDBDBD'
    ];

    const isMobile = window.innerWidth < 768;

    return (
        <div style={{ width: '100%', height: isMobile ? 320 : 380 }}>
            <ResponsiveContainer>
                <BarChart data={data} layout="vertical" margin={{ left: isMobile ? 0 : 10, right: 30 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke="#4b5563" 
                        fontSize={isMobile ? 8 : 10} 
                        width={isMobile ? 100 : 120}
                        tick={{ fill: '#9ca3af', fontWeight: 'bold' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }} 
                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={isMobile ? 10 : 16}>
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