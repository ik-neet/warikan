/**
 * 最少精算回数で誰が誰にいくら払うかを計算する
 * @param {string[]} members
 * @param {{ payer: string, amount: number }[]} payments
 * @returns {{ from: string, to: string, amount: number }[]}
 */
export function calcSettlements(members, payments) {
  const total = payments.reduce((s, p) => s + p.amount, 0)
  const perPerson = total / members.length

  const balance = {}
  members.forEach((m) => { balance[m] = 0 })
  payments.forEach((p) => { balance[p.payer] = (balance[p.payer] || 0) + p.amount })
  members.forEach((m) => { balance[m] -= perPerson })

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
