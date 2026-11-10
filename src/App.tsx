import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { TheaterPage } from './pages/TheaterPage'

export default function App() {
  // HashRouter keeps /watch/:service routes working on GitHub Pages (pilixtv.github.io).
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/watch/:serviceId" element={<TheaterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
