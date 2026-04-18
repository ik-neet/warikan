import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  doc, getDoc, collection, addDoc, onSnapshot,
  deleteDoc, getDocs, serverTimestamp, query, orderBy, updateDoc
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
  const [copied, setCopied] = useState(false)
  const [expiresAt, setExpiresAt] = useState(null)

  const [form, setForm] = useState({ payer: '', description: '', amount: '', isAdvance: false, advancedFor: '' })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [newMember, setNewMember] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  const [memberError, setMemberError] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ payer: '', description: '', amount: '', isAdvance: false, advancedFor: '' })
  const [editError, setEditError] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

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
      const saved = JSON.parse(localStorage.getItem('warikan_sessions') || '[]')
      const entry = saved.find(s => s.id === snap.id)
      if (entry) setExpiresAt(entry.expiresAt)
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

    if (!payer) { setFormError('お金を払った人を選択してください'); return }
    if (!form.amount || isNaN(amount) || amount <= 0) { setFormError('金額を正しく入力してください'); return }
    if (form.isAdvance && !form.advancedFor) { setFormError('立て替えされた人を選択してください'); return }
    if (form.isAdvance && form.advancedFor === payer) { setFormError('立て替えした人と立て替えされた人が同じです'); return }

    setSubmitting(true)
    setFormError('')
    try {
      await addDoc(collection(db, 'sessions', id, 'payments'), {
        payer,
        amount,
        description: description || (form.isAdvance ? '立て替え' : '支払い'),
        isAdvance: form.isAdvance,
        advancedFor: form.isAdvance ? form.advancedFor : '',
        createdAt: serverTimestamp(),
      })
      setForm({ payer: '', description: '', amount: '', isAdvance: false, advancedFor: '' })
    } catch {
      setFormError('追加に失敗しました')
    }
    setSubmitting(false)
  }

  const handleRemoveMember = async (index) => {
    if (session.members.length <= 2) { setMemberError('メンバーは2人以上必要です'); return }
    const updatedMembers = session.members.filter((_, i) => i !== index)
    try {
      await updateDoc(doc(db, 'sessions', id), { members: updatedMembers })
      setSession(prev => ({ ...prev, members: updatedMembers }))
    } catch {
      setMemberError('削除に失敗しました')
    }
  }

  const handleAddMember = async () => {
    const name = newMember.trim()
    if (!name) { setMemberError('名前を入力してください'); return }
    setAddingMember(true)
    setMemberError('')
    try {
      const updatedMembers = [...session.members, name]
      await updateDoc(doc(db, 'sessions', id), { members: updatedMembers })
      setSession(prev => ({ ...prev, members: updatedMembers }))
      setNewMember('')
    } catch {
      setMemberError('追加に失敗しました')
    }
    setAddingMember(false)
  }

  const handleDelete = async (paymentId) => {
    if (!confirm('この支払いを削除しますか？')) return
    await deleteDoc(doc(db, 'sessions', id, 'payments', paymentId))
  }

  const handleEditStart = (p) => {
    setEditingId(p.id)
    setEditForm({
      payer: p.payer,
      description: p.description,
      amount: String(p.amount),
      isAdvance: p.isAdvance || false,
      advancedFor: p.advancedFor || '',
    })
    setEditError('')
  }

  const handleEditSave = async () => {
    const payer = editForm.payer.trim()
    const amount = parseFloat(editForm.amount)
    const description = editForm.description.trim()

    if (!payer) { setEditError('お金を払った人を選択してください'); return }
    if (!editForm.amount || isNaN(amount) || amount <= 0) { setEditError('金額を正しく入力してください'); return }
    if (editForm.isAdvance && !editForm.advancedFor) { setEditError('立て替えされた人を選択してください'); return }
    if (editForm.isAdvance && editForm.advancedFor === payer) { setEditError('立て替えした人と立て替えされた人が同じです'); return }

    setEditSubmitting(true)
    setEditError('')
    try {
      await updateDoc(doc(db, 'sessions', id, 'payments', editingId), {
        payer,
        amount,
        description: description || (editForm.isAdvance ? '立て替え' : '支払い'),
        isAdvance: editForm.isAdvance,
        advancedFor: editForm.isAdvance ? editForm.advancedFor : '',
      })
      setEditingId(null)
    } catch {
      setEditError('更新に失敗しました')
    }
    setEditSubmitting(false)
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

  const normalPayments = payments.filter(p => !p.isAdvance)
  const advancePayments = payments.filter(p => p.isAdvance)
  const normalTotal = normalPayments.reduce((sum, p) => sum + p.amount, 0)
  const advanceTotal = advancePayments.reduce((sum, p) => sum + p.amount, 0)
  const totalAmount = normalTotal + advanceTotal
  const perPerson = session.members.length > 0 ? normalTotal / session.members.length : 0
  const settlements = calcSettlements(session.members, payments)

  const balanceMap = {}
  session.members.forEach(m => { balanceMap[m] = 0 })
  normalPayments.forEach(p => { balanceMap[p.payer] = (balanceMap[p.payer] || 0) + p.amount })
  session.members.forEach(m => { balanceMap[m] -= perPerson })
  advancePayments.forEach(p => {
    if (balanceMap[p.payer] !== undefined) balanceMap[p.payer] += p.amount
    if (p.advancedFor && balanceMap[p.advancedFor] !== undefined) balanceMap[p.advancedFor] -= p.amount
  })

  const memberTotals = session.members.map((m) => ({
    name: m,
    paid: payments.filter((p) => p.payer === m).reduce((s, p) => s + p.amount, 0),
    balance: Math.round(balanceMap[m] || 0),
  }))

  return (
    <div className="session-container">
      <div className="session-header">
        <button className="btn-back" onClick={() => navigate('/')}>← ホーム</button>
        <h1>支払管理画面</h1>
        <button className="btn-share" onClick={handleCopyUrl}>
          {copied ? 'コピーしました！' : 'URLをコピー'}
        </button>
      </div>

      <div className="url-display">
        <span className="url-text">{window.location.href}</span>
      </div>

      <div className="members-summary">
        <h2>メンバー</h2>
        <div className="session-meta">
          {session.createdAt && (
            <span>作成日: {session.createdAt.toDate().toLocaleDateString('ja-JP')}</span>
          )}
          {expiresAt && (
            <span>有効期限: {new Date(expiresAt).toLocaleDateString('ja-JP')}</span>
          )}
        </div>
        <div className="member-chips">
          {session.members.map((m, i) => (
            <span key={i} className="chip">
              {m}
              <button className="btn-remove-member" onClick={() => handleRemoveMember(i)} title="削除">×</button>
            </span>
          ))}
        </div>
        <div className="add-member-row">
          <input
            type="text"
            className="add-member-input"
            placeholder="メンバーを追加"
            value={newMember}
            onChange={(e) => setNewMember(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
            maxLength={20}
          />
          <button className="btn-add-member" onClick={handleAddMember} disabled={addingMember}>
            {addingMember ? '...' : '追加'}
          </button>
        </div>
        {memberError && <p className="error-text">{memberError}</p>}
      </div>

      <div className="section">
        <div className="section-header">
          <h2>支払い追加</h2>
        </div>
        <div className="payment-form">
          <select
            value={form.payer}
            onChange={(e) => setForm({ ...form, payer: e.target.value, advancedFor: '' })}
          >
            <option value="">支払い者を選択</option>
            {session.members.map((m, i) => <option key={i} value={m}>{m}</option>)}
          </select>
          <input
            type="text"
            placeholder="内容 (例: 夕食代)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            maxLength={50}
          />
          <input
            type="number"
            placeholder="金額 (円)"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            min="1"
          />
          <label className="advance-checkbox-label">
            <input
              type="checkbox"
              checked={form.isAdvance}
              onChange={(e) => setForm({ ...form, isAdvance: e.target.checked, advancedFor: '' })}
            />
            立て替え
          </label>
          <p className="advance-description">立て替えをした場合、その金額は割り勘にされず全額支払い者に精算されます</p>
          {form.isAdvance && (
            <select
              value={form.advancedFor}
              onChange={(e) => setForm({ ...form, advancedFor: e.target.value })}
            >
              <option value="">立て替えされた人を選択</option>
              {session.members.filter(m => m !== form.payer).map((m, i) => <option key={i} value={m}>{m}</option>)}
            </select>
          )}
          {formError && <p className="error-text">{formError}</p>}
          <button className="btn-primary" onClick={handleAddPayment} disabled={submitting}>
            {submitting ? '追加中...' : '追加'}
          </button>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>支払い一覧</h2>
        </div>
        {payments.length === 0 ? (
          <p className="empty-text">支払いがまだありません</p>
        ) : (
          <table className="payments-table">
            <thead>
              <tr><th>支払い者</th><th>内容</th><th>金額</th><th></th></tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                editingId === p.id ? (
                  <tr key={p.id}>
                    <td>
                      <select
                        value={editForm.payer}
                        onChange={(e) => setEditForm({ ...editForm, payer: e.target.value, advancedFor: '' })}
                        className="edit-select"
                      >
                        {session.members.map((m, i) => <option key={i} value={m}>{m}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="edit-description-cell">
                        <input
                          type="text"
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="edit-input"
                          maxLength={50}
                        />
                        <label className="advance-checkbox-label advance-checkbox-small">
                          <input
                            type="checkbox"
                            checked={editForm.isAdvance}
                            onChange={(e) => setEditForm({ ...editForm, isAdvance: e.target.checked, advancedFor: '' })}
                          />
                          立て替え
                        </label>
                        {editForm.isAdvance && (
                          <select
                            value={editForm.advancedFor}
                            onChange={(e) => setEditForm({ ...editForm, advancedFor: e.target.value })}
                            className="edit-select"
                          >
                            <option value="">立て替えされた人</option>
                            {session.members.filter(m => m !== editForm.payer).map((m, i) => <option key={i} value={m}>{m}</option>)}
                          </select>
                        )}
                      </div>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={editForm.amount}
                        onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                        className="edit-input edit-amount"
                        min="1"
                      />
                    </td>
                    <td className="edit-actions">
                      {editError && <p className="error-text" style={{fontSize:'11px',margin:'2px 0'}}>{editError}</p>}
                      <button className="btn-save" onClick={handleEditSave} disabled={editSubmitting}>
                        {editSubmitting ? '...' : '保存'}
                      </button>
                      <button className="btn-cancel-edit" onClick={() => setEditingId(null)}>✕</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id}>
                    <td>{p.payer}</td>
                    <td>
                      <div className="payment-description-cell">
                        <span>{p.description}</span>
                        {p.isAdvance && (
                          <span className="advance-badge">立替→{p.advancedFor}</span>
                        )}
                      </div>
                    </td>
                    <td className="amount">¥{p.amount.toLocaleString()}</td>
                    <td className="row-actions">
                      <button className="btn-edit" onClick={() => handleEditStart(p)}>編集</button>
                      <button className="btn-delete" onClick={() => handleDelete(p.id)}>削除</button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        )}
      </div>

      {payments.length > 0 && (
        <>
          <div className="section">
            <h2>支払い集計</h2>
            {advancePayments.length > 0 ? (
              <>
                <p className="total-label">通常合計: <strong>¥{normalTotal.toLocaleString()}</strong>　1人あたり: <strong>¥{Math.ceil(perPerson).toLocaleString()}</strong></p>
                <p className="total-label">立て替え合計: <strong>¥{advanceTotal.toLocaleString()}</strong></p>
              </>
            ) : (
              <>
                <p className="total-label">合計: <strong>¥{totalAmount.toLocaleString()}</strong></p>
                <p className="total-label">1人あたり: <strong>¥{Math.ceil(perPerson).toLocaleString()}</strong></p>
              </>
            )}
            <table className="summary-table">
              <thead>
                <tr><th>名前</th><th>支払い済み</th><th>収支</th></tr>
              </thead>
              <tbody>
                {memberTotals.map(({ name, paid, balance }, i) => (
                  <tr key={i}>
                    <td>{name}</td>
                    <td className="amount">¥{paid.toLocaleString()}</td>
                    <td className={balance >= 0 ? 'positive' : 'negative'}>
                      {balance >= 0 ? '+' : ''}¥{balance.toLocaleString()}
                    </td>
                  </tr>
                ))}
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
                    <a href="paypay://" className="btn-paypay">
                      PayPayで送金
                    </a>
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
