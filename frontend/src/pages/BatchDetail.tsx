import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
    ArrowLeft,
    MapPin,
    Thermometer,
    Droplets,
    Leaf,
    Clock,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    Activity
} from 'lucide-react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid
} from 'recharts'
import { api, BatchData } from '../services/api'

export default function BatchDetail() {
    const { tokenId } = useParams<{ tokenId: string }>()
    const queryClient = useQueryClient()
    const [isSimulating, setIsSimulating] = useState(false)

    const { data: batch, isLoading, error } = useQuery<BatchData>({
        queryKey: ['batch', tokenId],
        queryFn: () => api.getBatch(parseInt(tokenId || '0')),
        enabled: !!tokenId,
    })

    const simulateMutation = useMutation({
        mutationFn: async () => {
            setIsSimulating(true)
            await api.simulateIoT(parseInt(tokenId || '0'), 5)
            const result = await api.aggregateIoT(parseInt(tokenId || '0'))
            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['batch', tokenId] })
            setIsSimulating(false)
        },
        onError: () => setIsSimulating(false),
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        )
    }

    if (error || !batch) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Batch Not Found</h2>
                <p className="text-gray-400 mb-4">This batch may not exist or there was an error loading it.</p>
                <Link to="/" className="btn-primary">Back to Dashboard</Link>
            </div>
        )
    }

    // Mock temperature/humidity history data
    const historyData = [
        { time: '00:00', temp: 24, humidity: 65 },
        { time: '04:00', temp: 23, humidity: 68 },
        { time: '08:00', temp: 25, humidity: 62 },
        { time: '12:00', temp: 27, humidity: 58 },
        { time: '16:00', temp: 26, humidity: 61 },
        { time: '20:00', temp: 24, humidity: 64 },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/" className="p-2 glass rounded-lg hover:bg-white/10 transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">
                        Batch #{tokenId?.padStart(4, '0')}
                    </h1>
                    <p className="text-gray-400">Tracking details and history</p>
                </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-xl p-5"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-gray-400 text-sm">Origin</span>
                    </div>
                    <p className="font-semibold text-lg">{batch.origin || 'Unknown'}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass rounded-xl p-5"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                            <Thermometer className="w-5 h-5 text-orange-400" />
                        </div>
                        <span className="text-gray-400 text-sm">Temperature</span>
                    </div>
                    <p className="font-semibold text-lg">{batch.temperature}°C</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass rounded-xl p-5"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                            <Droplets className="w-5 h-5 text-cyan-400" />
                        </div>
                        <span className="text-gray-400 text-sm">Humidity</span>
                    </div>
                    <p className="font-semibold text-lg">{batch.humidity}%</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass rounded-xl p-5"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <Leaf className="w-5 h-5 text-green-400" />
                        </div>
                        <span className="text-gray-400 text-sm">Carbon Footprint</span>
                    </div>
                    <p className="font-semibold text-lg">{batch.carbonFootprint.toLocaleString()}g</p>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Temperature/Humidity Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="lg:col-span-2 glass rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold">Environmental Conditions</h2>
                        <button
                            onClick={() => simulateMutation.mutate()}
                            disabled={isSimulating}
                            className="btn-secondary text-sm py-2 flex items-center gap-2"
                        >
                            <Activity size={16} className={isSimulating ? 'animate-pulse' : ''} />
                            {isSimulating ? 'Simulating...' : 'Simulate IoT'}
                        </button>
                    </div>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={historyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="time" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px'
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="temp"
                                stroke="#f97316"
                                strokeWidth={2}
                                dot={{ fill: '#f97316', r: 4 }}
                                name="Temperature (°C)"
                            />
                            <Line
                                type="monotone"
                                dataKey="humidity"
                                stroke="#06b6d4"
                                strokeWidth={2}
                                dot={{ fill: '#06b6d4', r: 4 }}
                                name="Humidity (%)"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Batch Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass rounded-2xl p-6"
                >
                    <h2 className="text-lg font-semibold mb-4">Batch Information</h2>
                    <div className="space-y-4">
                        <div>
                            <p className="text-gray-400 text-sm">Supplier ID</p>
                            <p className="font-mono">{batch.supplierId}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Current Holder</p>
                            <p>{batch.currentHolder}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Owner Address</p>
                            <p className="font-mono text-sm truncate">{batch.owner}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Created</p>
                            <p>{new Date(batch.timestamp * 1000).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Compliance Status</p>
                            <div className="flex items-center gap-2 mt-1">
                                {batch.complianceStatus ? (
                                    <>
                                        <CheckCircle size={18} className="text-green-400" />
                                        <span className="text-green-400">Compliant</span>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle size={18} className="text-red-400" />
                                        <span className="text-red-400">Non-Compliant</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* History Timeline */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="glass rounded-2xl p-6"
            >
                <h2 className="text-lg font-semibold mb-6">Batch History</h2>
                <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-500 to-transparent" />
                    <div className="space-y-6">
                        {batch.history.map((event, i) => (
                            <div key={i} className="flex gap-4 ml-4">
                                <div className="w-3 h-3 rounded-full bg-primary-500 mt-1.5 -ml-[7px] ring-4 ring-gray-900" />
                                <div className="flex-1 glass rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                        <Clock size={14} />
                                        <span>Event #{i + 1}</span>
                                    </div>
                                    <p>{event}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
