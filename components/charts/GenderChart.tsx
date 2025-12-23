
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Gender, Member } from '../../types';

interface GenderChartProps {
    members: Member[];
}

const GenderChart: React.FC<GenderChartProps> = ({ members }) => {
    const genderCounts = members.reduce((acc, member) => {
        acc[member.gender] = (acc[member.gender] || 0) + 1;
        return acc;
    }, {} as Record<Gender, number>);
    
    const data = Object.entries(genderCounts).map(([name, value]) => ({ name, value }));

    const COLORS = ['#FF8042', '#0088FE', '#FFBB28'];

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default GenderChart;