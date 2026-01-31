import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
    Package,
    MapPin,
    Leaf,
    Loader2,
    CheckCircle,
    AlertCircle,
    FileText,
    Globe
} from 'lucide-react'
import { api } from '../services/api'
import { useWallet } from '../hooks/useWallet'
import GeolocationInput from '../components/GeolocationInput'
import type {
    EUDRFeatureCollection,
    DeforestationCheck,
    LegalityDocument,
    MintBatchRequest
} from '../types/eudr.types'
import { HS_CODES, LEGALITY_DOC_TYPES, EUDR_CONSTANTS } from '../types/eudr.types'

interface FormData {
    origin: string
    supplierId: string
    carbonFootprint: string
    description: string
    hs_code: string
    commodity_name: string
    quantity_net_mass_kg: string
    geolocation: EUDRFeatureCollection | null
    deforestation_status: boolean
    deforestation_date: string
    legalityDocs: Array<{
        type: string
        issuer: string
        issue_date: string
        ipfs_hash: string
    }>
}

export default function MintBatch() {
    const navigate = useNavigate()
    const { address, isConnected } = useWallet()
    const [geoErrors, setGeoErrors] = useState<string[]>([])

    const [formData, setFormData] = useState<FormData>({
        origin: '',
        supplierId: '',
        carbonFootprint: '',
        description: '',
        hs_code: EUDR_CONSTANTS.DEFAULT_HS_CODE,
        commodity_name: EUDR_CONSTANTS.DEFAULT_COMMODITY_NAME,
        quantity_net_mass_kg: '',
        geolocation: null,
        deforestation_status: false,
        deforestation_date: new Date().toISOString().split('T')[0],
        legalityDocs: []
    })

    const mintMutation = useMutation({
        mutationFn: async () => {
            if (!address) throw new Error('Wallet not connected')
            if (!formData.geolocation) throw new Error('Geolocation is required for EUDR compliance')

            const deforestationCheck: DeforestationCheck | undefined = formData.deforestation_status
                ? {
                    status: true,
                    checked_date: formData.deforestation_date,
                    source: 'manual'
                }
                : undefined

            const legalityDocuments: LegalityDocument[] = formData.legalityDocs
                .filter(doc => doc.type && doc.issuer)
                .map(doc => ({
                    type: doc.type as LegalityDocument['type'],
                    issuer: doc.issuer,
                    issue_date: doc.issue_date,
                    ipfs_hash: doc.ipfs_hash || 'pending'
                }))

            const request: MintBatchRequest = {
                to: address,
                origin: formData.origin,
                supplierId: formData.supplierId,
                geolocation: formData.geolocation,
                hs_code: formData.hs_code,
                commodity_name: formData.commodity_name,
                quantity_net_mass_kg: parseFloat(formData.quantity_net_mass_kg) || 0,
                carbonFootprint: parseInt(formData.carbonFootprint) || 0,
                deforestationCheck,
                legalityDocuments: legalityDocuments.length > 0 ? legalityDocuments : undefined,
                metadata: {
                    description: formData.description,
                    mintedAt: new Date().toISOString()
                }
            }

            return api.mintBatch(request)
        },
        onSuccess: (data) => setTimeout(() => navigate(`/batch/${data.tokenId}`), 2000)
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isConnected) return alert('Please connect your wallet first')

        // Validate geolocation
        if (!formData.geolocation) {
            setGeoErrors(['Geolocation is required for EUDR compliance'])
            return
        }

        // Validate with backend
        try {
            const validation = await api.validateGeolocation(formData.geolocation)
            if (!validation.valid) {
                setGeoErrors(validation.errors)
                return
            }
        } catch (err) {
            console.warn('Validation request failed, proceeding with client validation')
        }

        setGeoErrors([])
        mintMutation.mutate()
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const addLegalityDoc = () => {
        setFormData(prev => ({
            ...prev,
            legalityDocs: [...prev.legalityDocs, {
                type: 'land_tenure',
                issuer: '',
                issue_date: new Date().toISOString().split('T')[0],
                ipfs_hash: ''
            }]
        }))
    }

    const updateLegalityDoc = (index: number, field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            legalityDocs: prev.legalityDocs.map((doc, i) =>
                i === index ? { ...doc, [field]: value } : doc
            )
        }))
    }

    const removeLegalityDoc = (index: number) => {
        setFormData(prev => ({
            ...prev,
            legalityDocs: prev.legalityDocs.filter((_, i) => i !== index)
        }))
    }

    return (
        <div className="max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">Mint New Batch</h1>
                    <p className="text-gray-400 mt-1">Create EUDR-compliant cocoa batch NFT</p>
                </div>

                {/* Success Message */}
                {mintMutation.isSuccess && (
                    <div className="glass rounded-2xl p-8 text-center mb-6">
                        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Batch Minted!</h2>
                        <p className="text-gray-400">Token ID: #{mintMutation.data?.tokenId}</p>
                        <p className="text-gray-500 text-sm mt-2">
                            Compliance: {mintMutation.data?.compliance_status}
                        </p>
                    </div>
                )}

                {/* Error Message */}
                {mintMutation.isError && (
                    <div className="glass rounded-2xl p-6 mb-6 border border-red-500/30 flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                        <p className="text-sm text-gray-400">{(mintMutation.error as Error)?.message}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info Section */}
                    <div className="glass rounded-2xl p-6 space-y-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary-400" />
                            Origin & Supplier
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Origin</label>
                                <input
                                    type="text"
                                    name="origin"
                                    value={formData.origin}
                                    onChange={handleChange}
                                    placeholder="Ondo State, Nigeria"
                                    required
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Supplier ID</label>
                                <input
                                    type="text"
                                    name="supplierId"
                                    value={formData.supplierId}
                                    onChange={handleChange}
                                    placeholder="NGR-001"
                                    required
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Product Section */}
                    <div className="glass rounded-2xl p-6 space-y-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Package className="w-5 h-5 text-primary-400" />
                            Product Details
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">HS Code</label>
                                <select
                                    name="hs_code"
                                    value={formData.hs_code}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500"
                                >
                                    {HS_CODES.map(hs => (
                                        <option key={hs.code} value={hs.code}>{hs.code} - {hs.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Quantity (kg)</label>
                                <input
                                    type="number"
                                    name="quantity_net_mass_kg"
                                    value={formData.quantity_net_mass_kg}
                                    onChange={handleChange}
                                    placeholder="1000"
                                    required
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Carbon Footprint (g CO₂)</label>
                                <input
                                    type="number"
                                    name="carbonFootprint"
                                    value={formData.carbonFootprint}
                                    onChange={handleChange}
                                    placeholder="2500"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Commodity Name</label>
                                <input
                                    type="text"
                                    name="commodity_name"
                                    value={formData.commodity_name}
                                    onChange={handleChange}
                                    placeholder="cocoa beans"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Geolocation Section (EUDR Required) */}
                    <div className="glass rounded-2xl p-6 space-y-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Globe className="w-5 h-5 text-primary-400" />
                            Plot Geolocation
                            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Required</span>
                        </h3>
                        <p className="text-sm text-gray-400">
                            EUDR requires plot-level geolocation. Plots ≥4 ha need polygon coordinates.
                        </p>

                        <GeolocationInput
                            value={formData.geolocation}
                            onChange={(geo) => setFormData(prev => ({ ...prev, geolocation: geo }))}
                            errors={geoErrors}
                        />
                    </div>

                    {/* Deforestation Check Section */}
                    <div className="glass rounded-2xl p-6 space-y-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Leaf className="w-5 h-5 text-primary-400" />
                            Deforestation Status
                        </h3>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.deforestation_status}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        deforestation_status: e.target.checked
                                    }))}
                                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500"
                                />
                                <span className="text-sm">I confirm this batch is deforestation-free</span>
                            </label>
                        </div>

                        {formData.deforestation_status && (
                            <div>
                                <label className="text-sm font-medium mb-2 block">Verification Date</label>
                                <input
                                    type="date"
                                    name="deforestation_date"
                                    value={formData.deforestation_date}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500"
                                />
                            </div>
                        )}
                    </div>

                    {/* Legality Documents Section */}
                    <div className="glass rounded-2xl p-6 space-y-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary-400" />
                            Legality Documents
                            <span className="text-xs text-gray-500">(Optional)</span>
                        </h3>

                        {formData.legalityDocs.map((doc, index) => (
                            <div key={index} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">Document {index + 1}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeLegalityDoc(index)}
                                        className="text-red-400 text-sm hover:text-red-300"
                                    >
                                        Remove
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Document Type</label>
                                        <select
                                            value={doc.type}
                                            onChange={(e) => updateLegalityDoc(index, 'type', e.target.value)}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                                        >
                                            {LEGALITY_DOC_TYPES.map(type => (
                                                <option key={type.value} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Issuer</label>
                                        <input
                                            type="text"
                                            value={doc.issuer}
                                            onChange={(e) => updateLegalityDoc(index, 'issuer', e.target.value)}
                                            placeholder="Issuing Authority"
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Issue Date</label>
                                    <input
                                        type="date"
                                        value={doc.issue_date}
                                        onChange={(e) => updateLegalityDoc(index, 'issue_date', e.target.value)}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                                    />
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addLegalityDoc}
                            className="w-full py-2 border border-dashed border-white/20 rounded-lg text-gray-400 hover:border-primary-500/50 hover:text-primary-400 transition-colors"
                        >
                            + Add Legality Document
                        </button>
                    </div>

                    {/* Description */}
                    <div className="glass rounded-2xl p-6">
                        <label className="text-sm font-medium mb-2 block">Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Additional notes about this batch..."
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-primary-500 resize-none"
                        />
                    </div>

                    {/* Wallet Warning */}
                    {!isConnected && (
                        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                            <p className="text-sm text-yellow-400">Connect wallet to mint</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={mintMutation.isPending || !isConnected}
                        className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {mintMutation.isPending ? (
                            <><Loader2 className="w-5 h-5 animate-spin" />Minting...</>
                        ) : (
                            <><Package size={20} />Mint EUDR-Compliant Batch</>
                        )}
                    </button>
                </form>
            </motion.div>
        </div>
    )
}
