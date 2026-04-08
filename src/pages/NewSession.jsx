import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import '../styles/NewSession.css'

export default function NewSession() {
  const navigate = useNavigate()
  const [members, setMembers] = useState(['', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const updateMember = (index, value) => {
    const updated = [...members]
    updated[index] = value
    setMembers(updated)
  }

  const addMember = () => setMembers([...members, ''])

  const removeMember = (index) => {
    if (members.length <= 2) return
    setMembers(members.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    const validMembers = members.map((m) => m.trim()).filter(Boolean)
    if (validMembers.length < 2) {
      setError('メンバーを2人以上入力してください')
      return
    }
    setLoading(true)
    setError('')
    try {
      const docRef = await addDoc(collection(db, 'sessions'), {
        members: validMembers,
        createdAt: serverTimestamp(),
      })
      navigate(`/session/${docRef.id}`)
    } catch (e) {
      setError('セッションの作成に失敗しました')
      setLoading(false)
    }
  }

  return (
    <div className="new-session-container">
      <div className="new-session-card">
        <button className="btn-back" onClick={() => navigate('/')}>← 戻る</button>
        <h1>新規作成</h1>
        <p>参加するメンバーの名前を入力してください</p>

        <div className="members-list">
          {members.map((member, index) => (
            <div key={index} className="member-row">
              <input
                type="text"
                placeholder={`メンバー ${index + 1}`}
                value={member}
                onChange={(e) => updateMember(index, e.target.value)}
                maxLength={20}
              />
              {members.length > 2 && (
                <button className="btn-remove" onClick={() => removeMember(index)}>✕</button>
              )}
            </div>
          ))}
        </div>

        <button className="btn-secondary" onClick={addMember}>
          + メンバーを追加
        </button>

        {error && <p className="error-text">{error}</p>}

        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? '作成中...' : 'URLを生成する'}
        </button>
      </div>
    </div>
  )
}
