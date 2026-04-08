import { useNavigate } from 'react-router-dom'
import '../styles/Home.css'

export default function Home() {
  const navigate = useNavigate()

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
    </div>
  )
}
