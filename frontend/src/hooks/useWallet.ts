import { useState, useCallback } from 'react'
import { ethers } from 'ethers'

interface WalletState {
    address: string | null
    isConnected: boolean
    chainId: number | null
    provider: ethers.BrowserProvider | null
    signer: ethers.Signer | null
}

export function useWallet() {
    const [state, setState] = useState<WalletState>({
        address: null,
        isConnected: false,
        chainId: null,
        provider: null,
        signer: null,
    })

    const connect = useCallback(async () => {
        if (typeof window.ethereum === 'undefined') {
            alert('Please install MetaMask to use this application')
            return
        }

        try {
            const provider = new ethers.BrowserProvider(window.ethereum)
            const accounts = await provider.send('eth_requestAccounts', [])
            const signer = await provider.getSigner()
            const network = await provider.getNetwork()

            // Check if on Base Sepolia (84532)
            if (Number(network.chainId) !== 84532) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x14a34' }], // 84532 in hex
                    })
                } catch (switchError: any) {
                    // Chain not added, add it
                    if (switchError.code === 4902) {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x14a34',
                                chainName: 'Base Sepolia',
                                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                                rpcUrls: ['https://sepolia.base.org'],
                                blockExplorerUrls: ['https://sepolia.basescan.org'],
                            }],
                        })
                    }
                }
            }

            setState({
                address: accounts[0],
                isConnected: true,
                chainId: Number(network.chainId),
                provider,
                signer,
            })

            // Listen for account changes
            window.ethereum.on('accountsChanged', (accounts: string[]) => {
                if (accounts.length === 0) {
                    setState(s => ({ ...s, address: null, isConnected: false, signer: null }))
                } else {
                    setState(s => ({ ...s, address: accounts[0] }))
                }
            })

            // Listen for chain changes
            window.ethereum.on('chainChanged', () => {
                window.location.reload()
            })

        } catch (error) {
            console.error('Failed to connect wallet:', error)
        }
    }, [])

    const disconnect = useCallback(() => {
        setState({
            address: null,
            isConnected: false,
            chainId: null,
            provider: null,
            signer: null,
        })
    }, [])

    return {
        ...state,
        connect,
        disconnect,
    }
}

// Extend Window interface for TypeScript
declare global {
    interface Window {
        ethereum?: any
    }
}
