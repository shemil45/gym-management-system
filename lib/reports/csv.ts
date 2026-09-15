export type CsvCell = string | number | null | undefined

function escapeCell(cell: CsvCell): string {
    if (cell === null || cell === undefined) return ''
    const text = typeof cell === 'number' ? String(cell) : cell
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
    const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','))
    return `﻿${lines.join('\r\n')}`
}
