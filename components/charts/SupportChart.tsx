import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { SupportNeed, Member } from '../../types';

interface SupportChartProps {
    members: Member[];
}

const SupportChart: React.FC<SupportChartProps> = ({ members }) => {
    // Robust categorization: Initialize counts for all defined support needs
    const supportCounts = Object.values(SupportNeed).reduce((acc, need) => {
        acc[need] = 0;
        return acc;
    }, {} as Record<string, number>);

    // Aggregate member data safely
    members.forEach(member => {
        const need = member.support_need || (member as any).supportNeed;
        if (need && supportCounts[need] !== undefined) {
            supportCounts[need]++;
        }
    });

    const data = Object.entries(supportCounts).map(([name, value]) => ({ name, value }));

    const COLORS = ['#FF6600', '#FF8533', '#FFA366', '#FFC299', '#FFD1B3', '#FFE0CC', '#FFF0E6', '#FFFFFF'];

    return (
        <div style={{ width: '100%', height: 350 }} className="mt-4">
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                    <XAxis 
                        dataKey="name" 
                        stroke="#4b5563" 
                        angle={-45} 
                        textAnchor="end" 
                        height={80} 
                        interval={0}
                        fontSize={10}
                        tick={{ fill: '#9ca3af', fontWeight: 'bold' }}
                    />
                    <YAxis 
                        stroke="#4b5563" 
                        fontSize={10}
                        tick={{ fill: '#9ca3af' }}
                        allowDecimals={false}
                    />
                    <Tooltip 
                        cursor={{ fill: 'rgba(255, 102, 0, 0.05)' }} 
                        contentStyle={{ 
                            backgroundColor: '#0a0a0a', 
                            border: '1px solid #333',
                            borderRadius: '12px',
                            fontSize: '12px',
                            color: '#fff'
                        }} 
                        itemStyle={{ color: '#FF6600' }}
                    />
                    <Legend 
                        wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    />
                    <Bar dataKey="value" name="Support Requests" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default SupportChart;