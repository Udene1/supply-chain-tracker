import { motion } from 'framer-motion'
import { BarChart3, TrendingDown, Leaf, Globe } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const supplierData = [
    { name: 'NGR-001', emissions: 2500 },
    { name: 'NGR-002', emissions: 1800 },
    { name: 'NGR-003', emissions: 3200 },
    { name: 'NGR-004', emissions: 2100 },
    { name: 'NGR-005', emissions: 1500 },
]

const complianceData = [
    { name: 'Compliant', value: 85, color: '#22c55e' },
    { name: 'Non-Compliant', value: 15, color: '#ef4444' },
]

const stats = [
    { label: 'Avg Carbon/Batch', value: '2.4kg', icon: Leaf, color: 'text-green-400' },
    { label: 'Total Reduction', value: '-18%', icon: TrendingDown, color: 'text-blue-400' },
    { label: 'Countries', value: '3', icon: Globe, color: 'text-purple-400' },
    { label: 'Suppliers', value: '12', icon: BarChart3, color: 'text-orange-400' },
]

export default function Analytics() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Analytics</h1>
                <p className="text-gray-400 mt-1">Sustainability metrics and insights</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass rounded-xl p-5">
                        <stat.icon className={`w-6 h-6 ${stat.color} mb-3`} />
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-gray-400 text-sm">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-6">Emissions by Supplier</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={supplierData}>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(17,24,39,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                            <Bar dataKey="emissions" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-6">Compliance Rate</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={complianceData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                                {complianceData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </motion.div>
            </div>
        </div>
    )
}
