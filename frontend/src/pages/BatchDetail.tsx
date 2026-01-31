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
    Activity,
    Package,
    FileText,
    Download,
    Globe,
    ExternalLink
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
import ComplianceBadge from '../components/ComplianceBadge'
import BatchMap from '../components/BatchMap'

export default function BatchDetail() {
    const { tokenId } = useParams<{ tokenId: string }>()
    const queryClient = useQueryClient()
    const [isSimulating, setIsSimulating] = useState(false)
    const [isExporting, setIsExporting] = useState(false)

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

    const handleDownloadDDS = async () => {
        if (!tokenId) return
        setIsExporting(true)
        try {
            await api.downloadDDS(parseInt(tokenId))
        } catch (err) {
            console.error('Failed to download DDS:', err)
            alert('Failed to generate Due Diligence Statement')
        } finally {
            setIsExporting(false)
        }
    }

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

    const metadata = batch.ipfsMetadata
    const eudrStatus = metadata?.compliance_status || (batch.complianceStatus ? 'compliant' : 'non_compliant')

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
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 glass rounded-lg hover:bg-white/10 transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">
                                Batch #{tokenId?.padStart(4, '0')}
                            </h1>
                            <ComplianceBadge
                                status={eudrStatus as any}
                                hasGeolocation={!!metadata?.geolocation?.features?.length}
                                hasLegalityDocs={(metadata?.legality_documents?.length || 0) > 0}
                                isDeforestationFree={metadata?.deforestation_check?.status === true}
                            />
                        </div>
                        <p className="text-gray-400">EUDR Traceability Dashboard</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownloadDDS}
                        disabled={isExporting}
                        className="btn-primary flex items-center gap-2 text-sm"
                    >
                        {isExporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                        Export DDS (Annex II)
                    </button>
                    <a
                        href={`https://sepolia.basescan.org/token/${process.env.VITE_CONTRACT_ADDRESS}?a=${tokenId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary flex items-center gap-2 text-sm"
                    >
                        <ExternalLink size={16} />
                        View on Scan
                    </a>
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
                    <p className="text-xs text-gray-500 mt-1 truncate">{metadata?.supplierId}</p>
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
                    <p className="text-xs text-green-400 mt-1">Optimal Range</p>
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
                    <p className="text-xs text-green-400 mt-1">Optimal Range</p>
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
                        <span className="text-gray-400 text-sm">Emissions</span>
                    </div>
                    <p className="font-semibold text-lg">{batch.carbonFootprint.toLocaleString()}g</p>
                    <p className="text-xs text-gray-500 mt-1">CO₂e per kg</p>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Geolocation Map */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="lg:col-span-2 glass rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Globe size={18} className="text-primary-400" />
                            Production Plots
                        </h2>
                        <span className="text-xs text-gray-400">
                            {metadata?.geolocation?.features?.length || 0} Features Traceable
                        </span>
                    </div>
                    <div className="h-[400px]">
                        {metadata?.geolocation ? (
                            <BatchMap geolocation={metadata.geolocation} />
                        ) : (
                            <div className="w-full h-full bg-white/5 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-gray-500 gap-2">
                                <AlertCircle size={32} />
                                <p>Geolocation data restricted or missing</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* EUDR Compliance Sidebar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-6"
                >
                    {/* Compliance Checklist */}
                    <div className="glass rounded-2xl p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <FileText size={18} className="text-primary-400" />
                            EUDR Evidence
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className={metadata?.geolocation ? 'text-green-400' : 'text-red-400'}>
                                    {metadata?.geolocation ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Geolocation Coordinates</p>
                                    <p className="text-xs text-gray-500">Verified plot-level polygons (WGS-84)</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className={metadata?.deforestation_check?.status ? 'text-green-400' : 'text-yellow-400'}>
                                    {metadata?.deforestation_check?.status ? <CheckCircle size={18} /> : <Clock size={18} />}
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Deforestation-Free Proof</p>
                                    <p className="text-xs text-gray-500">Checked via {metadata?.deforestation_check?.source || 'satellite imagery'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className={(metadata?.legality_documents?.length || 0) > 0 ? 'text-green-400' : 'text-red-400'}>
                                    {(metadata?.legality_documents?.length || 0) > 0 ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Legality Documents</p>
                                    <p className="text-xs text-gray-500">{(metadata?.legality_documents?.length || 0)} documents attached</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Technical Specs */}
                    <div className="glass rounded-2xl p-6">
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Specs</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">HS Code</span>
                                <span className="font-mono">{metadata?.hs_code || '180100'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Commodity</span>
                                <span>{metadata?.commodity_name || 'Cocoa beans'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Quantity</span>
                                <span className="font-medium text-primary-400">{metadata?.quantity_net_mass_kg?.toLocaleString() || '0'} kg</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Scientific Name</span>
                                <span className="italic">{metadata?.scientific_name || 'Theobroma cacao'}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Environmental Conditions Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="lg:col-span-2 glass rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Activity size={18} className="text-orange-400" />
                            Storage Conditions
                        </h2>
                        <button
                            onClick={() => simulateMutation.mutate()}
                            disabled={isSimulating}
                            className="btn-secondary text-sm py-2 flex items-center gap-2"
                        >
                            <RefreshCw size={16} className={isSimulating ? 'animate-spin' : ''} />
                            {isSimulating ? 'Syncing...' : 'Simulate IoT'}
                        </button>
                    </div>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={historyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        fontSize: '12px'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="temp"
                                    stroke="#f97316"
                                    strokeWidth={3}
                                    dot={{ fill: '#f97316', r: 4, strokeWidth: 2, stroke: '#111827' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                    name="Temp (°C)"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="humidity"
                                    stroke="#06b6d4"
                                    strokeWidth={3}
                                    dot={{ fill: '#06b6d4', r: 4, strokeWidth: 2, stroke: '#111827' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                    name="Humidity (%)"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Blockchain Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="glass rounded-2xl p-6"
                >
                    <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <Package size={18} className="text-blue-400" />
                        NFT Metadata
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Holder</p>
                            <p className="text-sm truncate font-mono text-gray-300 bg-white/5 p-2 rounded-lg border border-white/5">
                                {batch.currentHolder}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Contract</p>
                            <p className="text-sm truncate font-mono text-gray-300 bg-white/5 p-2 rounded-lg border border-white/5">
                                {process.env.VITE_CONTRACT_ADDRESS || '0x...'}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Metadata Hash</p>
                            <p className="text-xs truncate font-mono text-gray-500 break-all">
                                {batch.geolocationHash || 'No on-chain hash detected'}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
