import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { SupportNeed, Member } from '../../types';

interface SupportChartProps {
    members: Member[];
}

const SupportChart: React.FC<SupportChartProps> = ({ members }) => {
    const supportCounts = Object.values(SupportNeed).reduce((acc, need) => {
        acc[need] = 0;
        return acc;
    }, {} as Record<string, number>);

    members.forEach(member => {
        const need = member.support_need;
        if (need && supportCounts[need] !== undefined) supportCounts[need]++;
    });

    const data = Object.entries(supportCounts).map(([name, value]) => ({ name, value }));

    // Palette: Primary Orange to White
    const COLORS = ['#FF6600', '#FF8533', '#FFA366', '#FFC299', '#FFD1B3', '#FFE0CC', '#FFF0E6', '#FFFFFF'];

    const isMobile = window.innerWidth < 768;

    return (
        <div style={{ width: '100%', height: isMobile ? 280 : 340 }}>
            <ResponsiveContainer>
                <BarChart data={data} margin={{ bottom: isMobile ? 30 : 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                    <XAxis 
                        dataKey="name" 
                        stroke="#4b5563" 
                        angle={-45} 
                        textAnchor="end" 
                        interval={0}
                        fontSize={isMobile ? 8 : 10}
                        tick={{ fill: '#9ca3af', fontWeight: 'bold' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis 
                        stroke="#4b5563" 
                        fontSize={isMobile ? 8 : 10}
                        tick={{ fill: '#9ca3af' }}
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', color: '#fff', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="value" barSize={isMobile ? 25 : 55} radius={[4, 4, 0, 0]}>
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