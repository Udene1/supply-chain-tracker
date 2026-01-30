import axios from 'axios'

const API_BASE = '/api'

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
    ipfsMetadata?: any
}

export interface MintRequest {
    to: string
    origin: string
    supplierId: string
    carbonFootprint?: number
    metadata?: Record<string, any>
}

export interface UpdateRequest {
    temperature?: number
    humidity?: number
    carbonFootprint?: number
    historyNote?: string
    metadata?: Record<string, any>
}

export const api = {
    // Batch endpoints
    async mintBatch(data: MintRequest) {
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

    // Health check
    async healthCheck() {
        const response = await axios.get(`${API_BASE.replace('/api', '')}/health`)
        return response.data
    },
}
