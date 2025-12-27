
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
        const g = member.gender || (member as any).gender;
        if (g && genderCounts[g] !== undefined) {
            genderCounts[g]++;
        }
    });
    
    const data = Object.entries(genderCounts)
        .filter(([_, value]) => value >= 0) // Keep all for consistent UI
        .map(([name, value]) => ({ name, value }));

    const COLORS = ['#FF6600', '#0088FE', '#FFBB28'];

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default GenderChart;
