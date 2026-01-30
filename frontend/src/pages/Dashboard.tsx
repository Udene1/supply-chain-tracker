import { motion } from 'framer-motion'
import {
    Package,
    TrendingUp,
    Leaf,
    Activity,
    ArrowUpRight,
    Clock,
    MapPin
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer
} from 'recharts'

// Mock data for demonstration
const mockBatches = [
    { id: 0, origin: 'Lagos, Nigeria', supplier: 'NGR-001', carbon: 2500, status: 'In Transit' },
    { id: 1, origin: 'Ibadan, Nigeria', supplier: 'NGR-002', carbon: 1800, status: 'Delivered' },
    { id: 2, origin: 'Kano, Nigeria', supplier: 'NGR-003', carbon: 3200, status: 'Processing' },
]

const emissionsData = [
    { month: 'Jan', emissions: 4200 },
    { month: 'Feb', emissions: 3800 },
    { month: 'Mar', emissions: 5100 },
    { month: 'Apr', emissions: 4600 },
    { month: 'May', emissions: 3900 },
    { month: 'Jun', emissions: 3200 },
]

const stats = [
    { label: 'Total Batches', value: '156', icon: Package, change: '+12%', color: 'from-blue-500 to-cyan-500' },
    { label: 'Carbon Saved', value: '24.5t', icon: Leaf, change: '-18%', color: 'from-green-500 to-emerald-500' },
    { label: 'Active Shipments', value: '23', icon: Activity, change: '+5%', color: 'from-purple-500 to-pink-500' },
    { label: 'Compliance Rate', value: '98.5%', icon: TrendingUp, change: '+2.3%', color: 'from-orange-500 to-amber-500' },
]

export default function Dashboard() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-bold"
                >
                    Welcome back 👋
                </motion.h1>
                <p className="text-gray-400 mt-1">
                    Track your sustainable supply chain in real-time
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass rounded-2xl p-6 card-hover"
                    >
                        <div className="flex items-start justify-between">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                                <stat.icon className="w-6 h-6 text-white" />
                            </div>
                            <span className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                                {stat.change}
                            </span>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-bold">{stat.value}</h3>
                            <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Emissions Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="lg:col-span-2 glass rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-semibold">Carbon Emissions</h2>
                            <p className="text-gray-400 text-sm">Monthly tracking (grams CO₂)</p>
                        </div>
                        <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                            <option>Last 6 months</option>
                            <option>Last year</option>
                        </select>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={emissionsData}>
                            <defs>
                                <linearGradient id="colorEmissions" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="month" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px'
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="emissions"
                                stroke="#22c55e"
                                fillOpacity={1}
                                fill="url(#colorEmissions)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Recent Activity */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass rounded-2xl p-6"
                >
                    <h2 className="text-xl font-semibold mb-6">Recent Activity</h2>
                    <div className="space-y-4">
                        {[
                            { action: 'Batch minted', batch: '#0156', time: '2 min ago', icon: Package },
                            { action: 'Custody transferred', batch: '#0155', time: '15 min ago', icon: ArrowUpRight },
                            { action: 'IoT data received', batch: '#0154', time: '1 hour ago', icon: Activity },
                            { action: 'Compliance verified', batch: '#0153', time: '3 hours ago', icon: Leaf },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                                    <item.icon size={18} className="text-primary-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{item.action}</p>
                                    <p className="text-xs text-gray-400">{item.batch}</p>
                                </div>
                                <span className="text-xs text-gray-500">{item.time}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Batches Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="glass rounded-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Active Batches</h2>
                        <Link to="/mint" className="btn-primary text-sm py-2">
                            + New Batch
                        </Link>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left p-4 text-gray-400 font-medium text-sm">Batch ID</th>
                                <th className="text-left p-4 text-gray-400 font-medium text-sm">Origin</th>
                                <th className="text-left p-4 text-gray-400 font-medium text-sm">Supplier</th>
                                <th className="text-left p-4 text-gray-400 font-medium text-sm">Carbon (g)</th>
                                <th className="text-left p-4 text-gray-400 font-medium text-sm">Status</th>
                                <th className="text-left p-4 text-gray-400 font-medium text-sm">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockBatches.map((batch) => (
                                <tr key={batch.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <span className="font-mono text-primary-400">#{batch.id.toString().padStart(4, '0')}</span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} className="text-gray-400" />
                                            {batch.origin}
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono text-sm">{batch.supplier}</td>
                                    <td className="p-4">{batch.carbon.toLocaleString()}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${batch.status === 'Delivered'
                                                ? 'bg-green-500/20 text-green-400'
                                                : batch.status === 'In Transit'
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : 'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {batch.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <Link
                                            to={`/batch/${batch.id}`}
                                            className="text-primary-400 hover:text-primary-300 text-sm font-medium"
                                        >
                                            View Details →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    )
}
