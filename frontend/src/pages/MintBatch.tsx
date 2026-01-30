import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Package, MapPin, User, Leaf, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { api } from '../services/api'
import { useWallet } from '../hooks/useWallet'

export default function MintBatch() {
    const navigate = useNavigate()
    const { address, isConnected } = useWallet()
    const [formData, setFormData] = useState({ origin: '', supplierId: '', carbonFootprint: '', description: '' })

    const mintMutation = useMutation({
        mutationFn: async () => {
            if (!address) throw new Error('Wallet not connected')
            return api.mintBatch({
                to: address,
                origin: formData.origin,
                supplierId: formData.supplierId,
                carbonFootprint: parseInt(formData.carbonFootprint) || 0,
                metadata: { description: formData.description, mintedAt: new Date().toISOString() }
            })
        },
        onSuccess: (data) => setTimeout(() => navigate(`/batch/${data.tokenId}`), 2000)
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!isConnected) return alert('Please connect your wallet first')
        mintMutation.mutate()
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    return (
        <div className="max-w-2xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">Mint New Batch</h1>
                    <p className="text-gray-400 mt-1">Create a new sustainable material batch NFT</p>
                </div>

                {mintMutation.isSuccess && (
                    <div className="glass rounded-2xl p-8 text-center mb-6">
                        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Batch Minted!</h2>
                        <p className="text-gray-400">Token ID: #{mintMutation.data?.tokenId}</p>
                    </div>
                )}

                {mintMutation.isError && (
                    <div className="glass rounded-2xl p-6 mb-6 border border-red-500/30 flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-red-400" />
                        <p className="text-sm text-gray-400">{(mintMutation.error as Error)?.message}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-6">
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium mb-2"><MapPin size={16} className="text-primary-400" />Origin</label>
                        <input type="text" name="origin" value={formData.origin} onChange={handleChange} placeholder="Lagos, Nigeria" required className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500" />
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium mb-2"><User size={16} className="text-primary-400" />Supplier ID</label>
                        <input type="text" name="supplierId" value={formData.supplierId} onChange={handleChange} placeholder="NGR-001" required className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500" />
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium mb-2"><Leaf size={16} className="text-primary-400" />Carbon (g CO₂)</label>
                        <input type="number" name="carbonFootprint" value={formData.carbonFootprint} onChange={handleChange} placeholder="2500" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500" />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-2 block">Description</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500 resize-none" />
                    </div>
                    {!isConnected && <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30"><p className="text-sm text-yellow-400">Connect wallet to mint</p></div>}
                    <button type="submit" disabled={mintMutation.isPending || !isConnected} className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
                        {mintMutation.isPending ? <><Loader2 className="w-5 h-5 animate-spin" />Minting...</> : <><Package size={20} />Mint Batch</>}
                    </button>
                </form>
            </motion.div>
        </div>
    )
}
