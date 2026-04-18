/**
 * 最少精算回数で誰が誰にいくら払うかを計算する
 * @param {string[]} members
 * @param {{ payer: string, amount: number, isAdvance?: boolean, advancedFor?: string }[]} payments
 * @returns {{ from: string, to: string, amount: number }[]}
 */
export function calcSettlements(members, payments) {
  const normalPayments = payments.filter(p => !p.isAdvance)
  const advancePayments = payments.filter(p => p.isAdvance)

  const normalTotal = normalPayments.reduce((s, p) => s + p.amount, 0)
  const perPerson = members.length > 0 ? normalTotal / members.length : 0

  const balance = {}
  members.forEach((m) => { balance[m] = 0 })

  // 通常支払い：全員で均等割り
  normalPayments.forEach((p) => { balance[p.payer] = (balance[p.payer] || 0) + p.amount })
  members.forEach((m) => { balance[m] -= perPerson })

  // 立て替え支払い：立て替えされた人が全額を払った人に返済
  advancePayments.forEach((p) => {
    if (balance[p.payer] !== undefined) balance[p.payer] += p.amount
    if (p.advancedFor && balance[p.advancedFor] !== undefined) balance[p.advancedFor] -= p.amount
  })

  const creditors = []
  const debtors = []
  Object.entries(balance).forEach(([name, amount]) => {
    const rounded = Math.round(amount)
    if (rounded > 0) creditors.push({ name, amount: rounded })
    else if (rounded < 0) debtors.push({ name, amount: -rounded })
  })

  const settlements = []
  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci]
    const debt = debtors[di]
    const transferAmount = Math.min(credit.amount, debt.amount)

    settlements.push({ from: debt.name, to: credit.name, amount: transferAmount })

    credit.amount -= transferAmount
    debt.amount -= transferAmount

    if (credit.amount === 0) ci++
    if (debt.amount === 0) di++
  }

  return settlements
}
