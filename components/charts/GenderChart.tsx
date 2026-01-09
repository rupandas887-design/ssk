import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Gender, Member } from '../../types';

interface GenderChartProps {
    members: Member[];
}

const GenderChart: React.FC<GenderChartProps> = ({ members }) => {
    const genderCounts = Object.values(Gender).reduce((acc, g) => {
        acc[g] = 0;
        return acc;
    }, {} as Record<string, number>);
    
    members.forEach(member => {
        const g = member.gender;
        if (g && genderCounts[g] !== undefined) genderCounts[g]++;
    });
    
    const data = Object.entries(genderCounts).map(([name, value]) => ({ name, value }));

    // Precise colors: Orange (Male), Blue (Female), Yellow (Other)
    const COLORS = ['#FF6600', '#0095FF', '#FFCC00'];

    const isMobile = window.innerWidth < 768;

    return (
        <div style={{ width: '100%', height: isMobile ? 240 : 280 }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={isMobile ? 55 : 75}
                        outerRadius={isMobile ? 85 : 110}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#fff' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center" 
                      iconType="rect"
                      iconSize={10}
                      formatter={(value) => <span className="text-[10px] md:text-[12px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-2">{value}</span>}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default GenderChart;