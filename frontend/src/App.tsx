import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import URLChecker from './pages/URLChecker'
import QRChecker from './pages/QRChecker'
import UPIChecker from './pages/UPIChecker'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/url" element={<URLChecker />} />
        <Route path="/qr" element={<QRChecker />} />
        <Route path="/upi" element={<UPIChecker />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </div>
  )
}
