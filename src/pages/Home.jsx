import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { doc, getDoc, deleteDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import '../styles/Home.css'

const STORAGE_KEY = 'warikan_sessions'
const EXPIRE_MS = 7 * 24 * 60 * 60 * 1000

function getSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

export default function Home() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const saved = getSaved()
      const now = Date.now()
      const expired = saved.filter(s => s.expiresAt < now)
      const valid = saved.filter(s => s.expiresAt >= now)

      for (const s of expired) {
        try {
          const snap = await getDocs(collection(db, 'sessions', s.id, 'payments'))
          await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
          await deleteDoc(doc(db, 'sessions', s.id))
        } catch {}
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valid))

      const results = []
      for (const s of valid) {
        try {
          const snap = await getDoc(doc(db, 'sessions', s.id))
          if (snap.exists()) results.push({ id: s.id, expiresAt: s.expiresAt, ...snap.data() })
        } catch {}
      }
      results.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setSessions(results)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="home-container">
      <div className="home-card">
        <div className="home-icon">💰</div>
        <h1>割り勘アプリ</h1>
        <p>みんなの支払いをかんたんに管理・精算できます</p>
        <button className="btn-primary" onClick={() => navigate('/new')}>
          新規作成
        </button>
      </div>

      {!loading && sessions.length > 0 && (
        <div className="sessions-list-card">
          <h2>作成したセッション</h2>
          <ul className="sessions-list">
            {sessions.map(s => (
              <li key={s.id}>
                <Link to={`/session/${s.id}`} className="session-item">
                  <span className="session-members">{s.members?.join('・')}</span>
                  <span className="session-expire">
                    {new Date(s.expiresAt).toLocaleDateString('ja-JP')} まで
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
