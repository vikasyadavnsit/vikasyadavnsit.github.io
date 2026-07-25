import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Home } from '@/pages/Home'
import { Meeting } from '@/pages/Meeting'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/meet/:roomId" element={<Meeting />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
