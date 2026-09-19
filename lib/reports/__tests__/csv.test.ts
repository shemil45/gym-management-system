import { describe, it, expect } from 'vitest'
import { toCsv } from '@/lib/reports/csv'

describe('toCsv', () => {
    it('writes a BOM, header row and CRLF endings', () => {
        expect(toCsv(['a', 'b'], [[1, 'x']])).toBe('﻿a,b\r\n1,x')
    })
    it('quotes commas, quotes and newlines', () => {
        expect(toCsv(['n'], [['a,b'], ['say "hi"'], ['line\nbreak']]))
            .toBe('﻿n\r\n"a,b"\r\n"say ""hi"""\r\n"line\nbreak"')
    })
    it('renders null/undefined as empty and numbers raw', () => {
        expect(toCsv(['a', 'b', 'c'], [[null, undefined, 1234.5]])).toBe('﻿a,b,c\r\n,,1234.5')
    })
})
