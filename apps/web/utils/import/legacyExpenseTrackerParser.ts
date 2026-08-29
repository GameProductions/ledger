import { Workbook } from 'exceljs'
import { ParsedLedgerData, PaycheckBlock, ExpenseItem, AccountAllocation } from './types'

function getMetadataColCount(year: number): number {
  if (year >= 2019) return 10
  if (year === 2015) return 8
  return 9
}

function monthIndex(name: string): number {
  const map: Record<string, number> = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11,
  }
  return map[name.toLowerCase()] ?? -1
}

function tryParseCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number') return String(v)
  if (typeof v === 'object' && 'result' in (v as any)) return String((v as any).result)
  return String(v)
}

function parseCents(v: unknown): number {
  const s = tryParseCell(v).replace(/[$,]/g, '')
  if (!s) return 0
  const n = parseFloat(s)
  if (isNaN(n)) return 0
  return Math.round(n * 100)
}

function parseDateFromCell(v: unknown, year: number, month: number): string {
  const s = tryParseCell(v)
  if (!s) return ''
  const num = Number(s)
  if (!isNaN(num) && num > 1 && num < 32) {
    const m = String(month + 1).padStart(2, '0')
    const d = String(Math.round(num)).padStart(2, '0')
    return `${year}-${m}-${d}`
  }
  const cleaned = s.replace(/[^\d/-]/g, '')
  const parts = cleaned.split(/[/-]/)
  if (parts.length === 3) {
    let [a, b, c] = parts
    if (c.length === 4) return `${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`
    if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`
  }
  return s
}

function findPersonPairs(
  headers: string[],
  startCol: number
): { persons: string[]; pairCount: number } {
  const persons = new Set<string>()
  for (let i = startCol; i < headers.length; i++) {
    const label = tryParseCell(headers[i]).toLowerCase()
    if (!label || label === 'notes' || label === 'year' || label === '') break
    if (label.length > 0 && /^[a-z]/i.test(label)) {
      persons.add(label.trim())
    }
  }
  const personList = Array.from(persons)
  return { persons: personList, pairCount: personList.length }
}

export function parseLegacyExpenseTracker(
  workbook: Workbook,
  sheetName: string
): ParsedLedgerData {
  const ws = workbook.getWorksheet(sheetName)
  if (!ws) throw new Error(`Sheet "${sheetName}" not found`)

  const allRows: string[][] = []
  ws.eachRow({ includeEmpty: true }, (row) => {
    const values: string[] = []
    row.eachCell({ includeEmpty: true }, (cell) => {
      values.push(tryParseCell(cell.value))
    })
    allRows.push(values)
  })

  const rawHeader = tryParseCell(allRows[0]?.[0] ?? '')
  const yearMatch = rawHeader.match(/\b(20\d{2})\b/)
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear()

  const metaCols = getMetadataColCount(year)
  const personsRow = allRows[1] ?? []
  const { persons, pairCount } = findPersonPairs(personsRow, metaCols)

  const totalColsCount = pairCount
  const personTotalStart = metaCols + 24
  const notesCol = personTotalStart + totalColsCount

  function getPersonAmount(row: string[], monthOffset: number, personIdx: number): number {
    const col = metaCols + monthOffset * pairCount + personIdx
    return parseCents(row[col])
  }

  function getPersonTotal(row: string[], personIdx: number): number {
    return parseCents(row[personTotalStart + personIdx])
  }

  function getMonthDates(row: string[]): Record<string, string> {
    const dates: Record<string, string> = {}
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
    for (let m = 0; m < 12; m++) {
      const firstPersonCol = metaCols + m * pairCount
      const val = tryParseCell(row[firstPersonCol])
      if (val) {
        const d = parseDateFromCell(val, year, m)
        if (d) dates[months[m]] = d
      }
    }
    return dates
  }

  function parsePaycheckBlock(startRowIdx: number): { block: PaycheckBlock; nextRowIdx: number } | null {
    const label = tryParseCell(allRows[startRowIdx]?.[0] ?? '')
    if (!label.toLowerCase().startsWith('paycheck')) return null

    let rowIdx = startRowIdx + 1

    const datesRow = allRows[rowIdx] ?? []
    const dates = getMonthDates(datesRow)

    const income: Record<string, number> = {}
    for (let p = 0; p < pairCount; p++) {
      const personName = persons[p] ?? `person-${p}`
      income[personName] = getPersonTotal(datesRow, p)
    }

    rowIdx++

    let additionalIncome: Record<string, number> | null = null
    let freeSpending: Record<string, number> | null = null
    const accountAllocations: AccountAllocation[] = []

    while (rowIdx < allRows.length) {
      const cellA = tryParseCell(allRows[rowIdx]?.[0] ?? '').toLowerCase()

      if (cellA.startsWith('paycheck')) break
      if (cellA.startsWith('sub total')) {
        rowIdx++
        break
      }

      if (cellA === 'additional income') {
        additionalIncome = {}
        for (let p = 0; p < pairCount; p++) {
          additionalIncome[persons[p] ?? `person-${p}`] = getPersonTotal(allRows[rowIdx], p)
        }
        rowIdx++
        continue
      }

      if (cellA === 'free spending') {
        freeSpending = {}
        for (let p = 0; p < pairCount; p++) {
          freeSpending[persons[p] ?? `person-${p}`] = getPersonTotal(allRows[rowIdx], p)
        }
        rowIdx++
        continue
      }

      const bankRelated = ['checking', 'savings', 'credit']
      if (bankRelated.some((b) => cellA.includes(b))) {
        const nextRow = allRows[rowIdx + 1] ?? []
        const bankName = tryParseCell(nextRow[1] ?? '')
        const accType = cellA
        if (bankName) {
          const amounts: Record<string, number> = {}
          for (let p = 0; p < pairCount; p++) {
            amounts[persons[p] ?? `person-${p}`] = getPersonTotal(allRows[rowIdx], p)
          }
          accountAllocations.push({ bankName, accountType: accType, amounts })
        }
        rowIdx++
        continue
      }

      const summaryKeywords = ['paycheck', 'core expenses', 'additional expenses', 'total expenses', 'base income']
      if (summaryKeywords.some((k) => cellA.startsWith(k))) {
        rowIdx++
        continue
      }

      const nextLabel = tryParseCell(allRows[rowIdx + 1]?.[0] ?? '').toLowerCase()
      if (nextLabel === '' || nextLabel === 'sub total' || nextLabel.startsWith('paycheck')) {
        rowIdx++
        continue
      }

      break
    }

    const expenses: ExpenseItem[] = []
    while (rowIdx < allRows.length) {
      const cellA = tryParseCell(allRows[rowIdx]?.[0] ?? '').toLowerCase()

      if (cellA.startsWith('paycheck') || cellA.startsWith('sub total')) {
        break
      }

      const row = allRows[rowIdx] ?? []
      const billName = tryParseCell(row[0])
      const payee = tryParseCell(row[1])
      if (!billName && !payee) {
        rowIdx++
        continue
      }

      let paidBy: string | null = null
      let amountCents = 0

      for (let m = 0; m < 12; m++) {
        for (let p = 0; p < pairCount; p++) {
          const val = parseCents(row[metaCols + m * pairCount + p])
          if (val > 0) {
            const personName = persons[p] ?? `person-${p}`
            if (!paidBy) {
              paidBy = personName
              amountCents = val
            }
          }
        }
      }

      expenses.push({
        billName,
        payee,
        category: tryParseCell(row[2]) || null,
        balance: parseFloat(tryParseCell(row[3])) || null,
        averagePayment: parseFloat(tryParseCell(row[4])) || null,
        dueDate: tryParseCell(row[5]) || null,
        frequency: tryParseCell(row[6]) || null,
        autoManual: tryParseCell(row[7]) || null,
        paymentMethod: tryParseCell(row[8]) || null,
        paidBy,
        amountCents,
        notes: tryParseCell(row[notesCol]) || null,
      })

      rowIdx++
    }

    const block: PaycheckBlock = {
      label,
      dates,
      income,
      additionalIncome,
      accountAllocations,
      freeSpending,
      expenses,
    }

    return { block, nextRowIdx: rowIdx }
  }

  function getGlobalRow(rowIdx: number): Record<string, number> {
    const amounts: Record<string, number> = {}
    for (let p = 0; p < pairCount; p++) {
      amounts[persons[p] ?? `person-${p}`] = getPersonTotal(allRows[rowIdx] ?? [], p)
    }
    return amounts
  }

  let netIncome: Record<string, number> = {}
  let totalExpenses: Record<string, number> = {}

  for (let i = 2; i < allRows.length; i++) {
    const cellA = tryParseCell(allRows[i]?.[0] ?? '').toLowerCase()
    if (cellA === 'net income') {
      netIncome = getGlobalRow(i)
    } else if (cellA === 'expenses') {
      const nextVal = tryParseCell(allRows[i]?.[1] ?? '').toLowerCase()
      if (!nextVal || nextVal === '' || nextVal === 'name of payee') {
        totalExpenses = getGlobalRow(i)
      }
    } else if (cellA.startsWith('paycheck')) {
      break
    }
  }

  const paychecks: PaycheckBlock[] = []
  let idx = 3
  while (idx < allRows.length) {
    const result = parsePaycheckBlock(idx)
    if (result) {
      paychecks.push(result.block)
      idx = result.nextRowIdx
    } else {
      idx++
    }
  }

  return {
    year,
    persons,
    netIncome,
    totalExpenses,
    paychecks,
  }
}
