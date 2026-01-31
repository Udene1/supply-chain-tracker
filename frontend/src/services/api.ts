import axios from 'axios'
import type {
    MintBatchRequest,
    MintBatchResponse,
    DueDiligenceStatement,
    EUDRFeatureCollection,
    ComplianceStatus
} from '../types/eudr.types'

const API_BASE = '/api'

// =============================================================================
// Legacy Types (for backward compatibility)
// =============================================================================

export interface BatchData {
    tokenId: number
    origin: string
    timestamp: number
    supplierId: string
    carbonFootprint: number
    temperature: number
    humidity: number
    complianceStatus: boolean
    currentHolder: string
    owner: string
    tokenUri: string
    history: string[]
    geolocationHash?: string
    ipfsMetadata?: BatchMetadata
}

export interface BatchMetadata {
    batch_id: string
    name: string
    description?: string
    origin: string
    supplierId: string
    hs_code: string
    commodity_name: string
    scientific_name?: string
    quantity_net_mass_kg: number
    geolocation?: EUDRFeatureCollection
    geolocation_hash?: string
    deforestation_check?: {
        status: boolean
        checked_date: string
        source: string
        evidence_ipfs?: string
    }
    legality_documents?: Array<{
        type: string
        issuer: string
        issue_date: string
        expiry_date?: string
        ipfs_hash: string
    }>
    carbonFootprint: number
    compliance_status: ComplianceStatus
    timestamp: string
}

export interface UpdateRequest {
    temperature?: number
    humidity?: number
    carbonFootprint?: number
    historyNote?: string
    metadata?: Record<string, unknown>
}

// =============================================================================
// API Client
// =============================================================================

export const api = {
    // Batch endpoints
    async mintBatch(data: MintBatchRequest): Promise<MintBatchResponse> {
        const response = await axios.post(`${API_BASE}/batch/mint`, data)
        return response.data
    },

    async getBatch(tokenId: number): Promise<BatchData> {
        const response = await axios.get(`${API_BASE}/batch/${tokenId}`)
        return response.data
    },

    async updateBatch(tokenId: number, data: UpdateRequest) {
        const response = await axios.post(`${API_BASE}/batch/${tokenId}/update`, data)
        return response.data
    },

    async transferCustody(tokenId: number, nextHolder: string, historyNote?: string) {
        const response = await axios.post(`${API_BASE}/batch/${tokenId}/transfer`, {
            nextHolder,
            historyNote,
        })
        return response.data
    },

    async checkCompliance(tokenId: number, maxCarbon?: number) {
        const response = await axios.get(`${API_BASE}/batch/${tokenId}/compliance`, {
            params: { maxCarbon },
        })
        return response.data
    },

    // EUDR endpoints
    async validateGeolocation(geolocation: EUDRFeatureCollection) {
        const response = await axios.post(`${API_BASE}/batch/validate-geolocation`, {
            geolocation
        })
        return response.data
    },

    // DDS endpoints
    async generateDDS(tokenId: number): Promise<DueDiligenceStatement> {
        const response = await axios.get(`${API_BASE}/dds/generate/${tokenId}`)
        return response.data
    },

    async previewDDS(tokenId: number): Promise<DueDiligenceStatement> {
        const response = await axios.get(`${API_BASE}/dds/preview/${tokenId}`)
        return response.data
    },

    async downloadDDS(tokenId: number): Promise<void> {
        const response = await axios.get(`${API_BASE}/dds/generate/${tokenId}`, {
            responseType: 'blob'
        })

        // Create download link
        const blob = new Blob([JSON.stringify(response.data, null, 2)], {
            type: 'application/json'
        })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `DDS-batch-${tokenId}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
    },

    // IoT endpoints
    async sendIoTData(data: {
        tokenId: number
        deviceId?: string
        temperature: number
        humidity: number
        location?: { lat: number; lng: number }
    }) {
        const response = await axios.post(`${API_BASE}/iot/data`, data)
        return response.data
    },

    async simulateIoT(tokenId: number, count?: number) {
        const response = await axios.post(`${API_BASE}/iot/simulate/${tokenId}`, { count })
        return response.data
    },

    async aggregateIoT(tokenId: number) {
        const response = await axios.post(`${API_BASE}/iot/aggregate/${tokenId}`)
        return response.data
    },

    async getIoTBuffer(tokenId: number) {
        const response = await axios.get(`${API_BASE}/iot/buffer/${tokenId}`)
        return response.data
    },

    // File upload for legality documents
    async uploadDocument(file: File): Promise<{ ipfs_hash: string; url: string }> {
        const formData = new FormData()
        formData.append('file', file)

        // Note: This would need a backend endpoint to handle file uploads to IPFS
        // For now, we'll simulate it
        const response = await axios.post(`${API_BASE}/documents/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        return response.data
    },

    // Health check
    async healthCheck() {
        const response = await axios.get(`${API_BASE.replace('/api', '')}/health`)
        return response.data
    },
}
