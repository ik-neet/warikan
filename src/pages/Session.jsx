import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  doc, getDoc, collection, addDoc, onSnapshot,
  deleteDoc, getDocs, serverTimestamp, query, orderBy
} from 'firebase/firestore'
import { db } from '../firebase'
import { calcSettlements } from '../utils/calcSettlements'
import '../styles/Session.css'

export default function Session() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState({ payer: '', amount: '', description: '' })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchSession = async () => {
      const docRef = doc(db, 'sessions', id)
      const snap = await getDoc(docRef)
      if (!snap.exists()) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setSession({ id: snap.id, ...snap.data() })
      setLoading(false)
    }
    fetchSession()
  }, [id])

  useEffect(() => {
    if (!session) return
    const q = query(
      collection(db, 'sessions', id, 'payments'),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [session, id])

  const handleAddPayment = async () => {
    const payer = form.payer.trim()
    const amount = parseFloat(form.amount)
    const description = form.description.trim()

    if (!payer) { setFormError('支払い者を選択してください'); return }
    if (!form.amount || isNaN(amount) || amount <= 0) { setFormError('金額を正しく入力してください'); return }

    setSubmitting(true)
    setFormError('')
    try {
      await addDoc(collection(db, 'sessions', id, 'payments'), {
        payer,
        amount,
        description: description || '支払い',
        createdAt: serverTimestamp(),
      })
      setForm({ payer: '', amount: '', description: '' })
      setShowForm(false)
    } catch {
      setFormError('追加に失敗しました')
    }
    setSubmitting(false)
  }

  const handleDelete = async (paymentId) => {
    if (!confirm('この支払いを削除しますか？')) return
    await deleteDoc(doc(db, 'sessions', id, 'payments', paymentId))
  }

  const handleDeleteSession = async () => {
    if (!confirm('このセッションを削除しますか？\nこの操作は元に戻せません。')) return
    try {
      const snap = await getDocs(collection(db, 'sessions', id, 'payments'))
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
      await deleteDoc(doc(db, 'sessions', id))
      const saved = JSON.parse(localStorage.getItem('warikan_sessions') || '[]')
      localStorage.setItem('warikan_sessions', JSON.stringify(saved.filter(s => s.id !== id)))
      navigate('/')
    } catch {
      alert('削除に失敗しました')
    }
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="loading">読み込み中...</div>
  if (notFound) return (
    <div className="not-found">
      <p>セッションが見つかりません</p>
      <button className="btn-primary" onClick={() => navigate('/')}>ホームへ</button>
    </div>
  )

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)
  const perPerson = session.members.length > 0 ? totalAmount / session.members.length : 0
  const settlements = calcSettlements(session.members, payments)

  const memberTotals = session.members.map((m) => ({
    name: m,
    paid: payments.filter((p) => p.payer === m).reduce((s, p) => s + p.amount, 0),
  }))

  return (
    <div className="session-container">
      <div className="session-header">
        <button className="btn-back" onClick={() => navigate('/')}>← ホーム</button>
        <h1>割り勘セッション</h1>
        <button className="btn-share" onClick={handleCopyUrl}>
          {copied ? 'コピーしました！' : 'URLをコピー'}
        </button>
      </div>

      <div className="url-display">
        <span className="url-text">{window.location.href}</span>
      </div>

      <div className="members-summary">
        <h2>メンバー</h2>
        <div className="member-chips">
          {session.members.map((m, i) => <span key={i} className="chip">{m}</span>)}
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>支払い一覧</h2>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'キャンセル' : '+ 支払い追加'}
          </button>
        </div>

        {showForm && (
          <div className="payment-form">
            <select
              value={form.payer}
              onChange={(e) => setForm({ ...form, payer: e.target.value })}
            >
              <option value="">支払い者を選択</option>
              {session.members.map((m, i) => <option key={i} value={m}>{m}</option>)}
            </select>
            <input
              type="number"
              placeholder="金額 (円)"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              min="1"
            />
            <input
              type="text"
              placeholder="内容 (例: 夕食代)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={50}
            />
            {formError && <p className="error-text">{formError}</p>}
            <button className="btn-primary" onClick={handleAddPayment} disabled={submitting}>
              {submitting ? '追加中...' : '追加'}
            </button>
          </div>
        )}

        {payments.length === 0 ? (
          <p className="empty-text">支払いがまだありません</p>
        ) : (
          <table className="payments-table">
            <thead>
              <tr><th>支払い者</th><th>内容</th><th>金額</th><th></th></tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.payer}</td>
                  <td>{p.description}</td>
                  <td className="amount">¥{p.amount.toLocaleString()}</td>
                  <td>
                    <button className="btn-delete" onClick={() => handleDelete(p.id)}>削除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {payments.length > 0 && (
        <>
          <div className="section">
            <h2>支払い集計</h2>
            <p className="total-label">合計: <strong>¥{totalAmount.toLocaleString()}</strong></p>
            <p className="total-label">1人あたり: <strong>¥{Math.ceil(perPerson).toLocaleString()}</strong></p>
            <table className="summary-table">
              <thead>
                <tr><th>名前</th><th>支払い済み</th><th>差額</th></tr>
              </thead>
              <tbody>
                {memberTotals.map(({ name, paid }, i) => {
                  const diff = paid - perPerson
                  return (
                    <tr key={i}>
                      <td>{name}</td>
                      <td className="amount">¥{paid.toLocaleString()}</td>
                      <td className={diff >= 0 ? 'positive' : 'negative'}>
                        {diff >= 0 ? '+' : ''}¥{Math.round(diff).toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="section">
            <h2>精算方法</h2>
            {settlements.length === 0 ? (
              <p className="empty-text">精算は不要です</p>
            ) : (
              <ul className="settlements-list">
                {settlements.map((s, i) => (
                  <li key={i} className="settlement-item">
                    <span className="debtor">{s.from}</span>
                    <span className="arrow">→</span>
                    <span className="creditor">{s.to}</span>
                    <span className="settlement-amount">¥{s.amount.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
      <div className="section-delete">
        <button className="btn-delete-session" onClick={handleDeleteSession}>
          このセッションを削除
        </button>
      </div>
    </div>
  )
}
