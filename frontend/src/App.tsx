import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import BatchDetail from './pages/BatchDetail'
import MintBatch from './pages/MintBatch'
import Analytics from './pages/Analytics'

function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="batch/:tokenId" element={<BatchDetail />} />
                <Route path="mint" element={<MintBatch />} />
                <Route path="analytics" element={<Analytics />} />
            </Route>
        </Routes>
    )
}

export default App
