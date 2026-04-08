import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import NewSession from './pages/NewSession'
import Session from './pages/Session'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/new" element={<NewSession />} />
      <Route path="/session/:id" element={<Session />} />
    </Routes>
  )
}
