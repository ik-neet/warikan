import { useState, useMemo } from 'react'

function evalExpr(expr) {
  if (!expr || !/^[\d\s+\-*/.]+$/.test(expr.trim())) return null
  try {
    // eslint-disable-next-line no-new-func
    const val = Function('"use strict"; return (' + expr + ')')()
    if (!isFinite(val) || isNaN(val)) return null
    return Math.round(val * 100) / 100
  } catch {
    return null
  }
}

const BUTTONS = [
  { label: 'AC',  type: 'ac' },
  { label: '←',  type: 'back' },
  { label: '÷',  type: 'op', value: '/' },
  { label: '×',  type: 'op', value: '*' },
  { label: '7',   type: 'digit' },
  { label: '8',   type: 'digit' },
  { label: '9',   type: 'digit' },
  { label: '−',  type: 'op', value: '-' },
  { label: '4',   type: 'digit' },
  { label: '5',   type: 'digit' },
  { label: '6',   type: 'digit' },
  { label: '+',   type: 'op', value: '+' },
  { label: '1',   type: 'digit' },
  { label: '2',   type: 'digit' },
  { label: '3',   type: 'digit' },
  { label: '=',   type: 'eval' },
  { label: '0',   type: 'digit', wide: true },
  { label: '.',   type: 'digit' },
  { label: '確定', type: 'confirm' },
]

export default function CalcModal({ onConfirm, onClose }) {
  const [expr, setExpr] = useState('')
  const [baseExpr, setBaseExpr] = useState('')

  const result = useMemo(() => evalExpr(expr), [expr])

  const handleButton = (btn) => {
    switch (btn.type) {
      case 'ac':
        setExpr('')
        setBaseExpr('')
        break
      case 'back':
        setExpr(e => e.slice(0, -1))
        setBaseExpr('')
        break
      case 'eval':
        if (result !== null) {
          setBaseExpr(expr)
          setExpr(String(result))
        }
        break
      case 'confirm':
        if (result !== null && result > 0) onConfirm(result, baseExpr || expr)
        break
      case 'digit':
        setExpr(e => e + btn.label)
        setBaseExpr('')
        break
      case 'op':
        setExpr(e => e + btn.value)
        setBaseExpr('')
        break
    }
  }

  return (
    <div className="calc-overlay" onClick={onClose}>
      <div className="calc-modal" onClick={e => e.stopPropagation()}>
        <div className="calc-header">
          <span className="calc-title">電卓</span>
          <button className="calc-close" onClick={onClose}>✕</button>
        </div>
        <div className="calc-display">
          {baseExpr ? (
            <>
              <div className="calc-base-expr">{baseExpr}</div>
              <div className="calc-expr">{expr}</div>
            </>
          ) : (
            <div className="calc-expr">{expr || '0'}</div>
          )}
          <div className="calc-result">
            {!baseExpr && result !== null ? `= ${result.toLocaleString()}` : ' '}
          </div>
        </div>
        <div className="calc-grid">
          {BUTTONS.map((btn, i) => (
            <button
              key={i}
              className={[
                'calc-btn',
                btn.wide ? 'calc-btn-wide' : '',
                btn.type === 'op' ? 'calc-btn-op' : '',
                btn.type === 'ac' || btn.type === 'back' ? 'calc-btn-func' : '',
                btn.type === 'eval' ? 'calc-btn-eval' : '',
                btn.type === 'confirm' ? 'calc-btn-confirm' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => handleButton(btn)}
              disabled={btn.type === 'confirm' && (result === null || result <= 0)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
