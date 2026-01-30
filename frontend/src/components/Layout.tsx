import { Outlet, NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    LayoutDashboard,
    Package,
    BarChart3,
    Leaf,
    Wallet,
    Menu,
    X
} from 'lucide-react'
import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const { address, isConnected, connect, disconnect } = useWallet()

    const navItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/mint', icon: Package, label: 'Mint Batch' },
        { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    ]

    return (
        <div className="min-h-screen flex">
            {/* Mobile menu button */}
            <button
                className="lg:hidden fixed top-4 left-4 z-50 p-2 glass rounded-lg"
                onClick={() => setSidebarOpen(!sidebarOpen)}
            >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar */}
            <motion.aside
                initial={{ x: -280 }}
                animate={{ x: sidebarOpen || window.innerWidth >= 1024 ? 0 : -280 }}
                className="fixed lg:static w-72 h-screen glass-dark z-40 flex flex-col"
            >
                {/* Logo */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center">
                            <Leaf className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg gradient-text">SupplyChain</h1>
                            <p className="text-xs text-gray-400">Sustainable Tracking</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                                    : 'hover:bg-white/5 text-gray-400 hover:text-white'
                                }`
                            }
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Wallet Connection */}
                <div className="p-4 border-t border-white/10">
                    {isConnected ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 px-3 py-2 glass rounded-lg">
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-sm text-gray-300 font-mono truncate">
                                    {address?.slice(0, 6)}...{address?.slice(-4)}
                                </span>
                            </div>
                            <button
                                onClick={disconnect}
                                className="w-full px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={connect}
                            className="w-full btn-primary flex items-center justify-center gap-2"
                        >
                            <Wallet size={18} />
                            Connect Wallet
                        </button>
                    )}
                </div>
            </motion.aside>

            {/* Main content */}
            <main className="flex-1 lg:ml-0 p-6 lg:p-8 overflow-auto">
                <Outlet />
            </main>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    )
}
