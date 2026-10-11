import moment from 'moment'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import * as query from '../src/query'
import {hours, now, session} from './helpers'

beforeEach(() => {
    vi.useFakeTimers()
})

afterEach(() => {
    vi.useRealTimers()
})

describe('current', () => {
    it('is zero without entries', () => {
        now('2026-10-11T12:00:00+02:00')
        expect(query.current([])).toBe('0 seconds')
    })

    it('is zero when stopped', () => {
        now('2026-10-11T12:00:00+02:00')
        expect(query.current(session('2026-10-11T08:00:00+02:00', '2026-10-11T09:00:00+02:00'))).toBe('0 seconds')
    })

    it('is the running session', () => {
        now('2026-10-11T12:00:00+02:00')
        expect(query.current(session('2026-10-11T10:30:00+02:00'))).toBe('1 hour, 30 minutes')
    })
})

describe('ever', () => {
    it('is zero without entries', () => {
        now('2026-10-11T12:00:00+02:00')
        expect(query.ever([])).toBe('0 seconds')
    })

    it('sums all sessions including the running one', () => {
        now('2026-10-11T12:00:00+02:00')
        const entries = [
            ...session('2024-01-01T08:00:00+01:00', '2024-01-01T10:00:00+01:00'),
            ...session('2026-10-10T08:00:00+02:00', '2026-10-10T09:00:00+02:00'),
            ...session('2026-10-11T11:00:00+02:00'),
        ]
        expect(query.ever(entries)).toBe('4 hours')
    })
})

describe('today', () => {
    it('counts only sessions since midnight', () => {
        now('2026-10-11T18:00:00+02:00')
        const entries = [
            ...session('2026-10-10T08:00:00+02:00', '2026-10-10T16:00:00+02:00'),
            ...session('2026-10-11T08:00:00+02:00', '2026-10-11T10:00:00+02:00'),
            ...session('2026-10-11T11:00:00+02:00', '2026-10-11T12:30:00+02:00'),
        ]
        expect(query.today(entries)).toBe('3 hours, 30 minutes')
    })

    it('counts a running session', () => {
        now('2026-10-11T12:00:00+02:00')
        expect(query.today(session('2026-10-11T10:00:00+02:00'))).toBe('2 hours')
    })

    it('counts only the part after midnight of a stopped session crossing midnight', () => {
        now('2026-10-11T10:00:00+02:00')
        expect(query.today(session('2026-10-10T22:00:00+02:00', '2026-10-11T01:00:00+02:00'))).toBe('1 hour')
    })

    it('counts only the part after midnight of a running session crossing midnight', () => {
        now('2026-10-11T01:00:00+02:00')
        expect(query.today(session('2026-10-10T23:00:00+02:00'))).toBe('1 hour')
    })

    it('counts a crossing session plus later sessions', () => {
        now('2026-10-11T10:00:00+02:00')
        const entries = [
            ...session('2026-10-10T22:00:00+02:00', '2026-10-11T01:00:00+02:00'),
            ...session('2026-10-11T08:00:00+02:00'),
        ]
        expect(query.today(entries)).toBe('3 hours')
    })

    it('is zero right after midnight when the last session ended before', () => {
        now('2026-10-11T00:00:30+02:00')
        expect(query.today(session('2026-10-10T20:00:00+02:00', '2026-10-10T23:59:00+02:00'))).toBe('0 seconds')
    })

    it('counts a session starting exactly at midnight', () => {
        now('2026-10-11T10:00:00+02:00')
        expect(query.today(session('2026-10-11T00:00:00+02:00', '2026-10-11T02:00:00+02:00'))).toBe('2 hours')
    })
})

describe('yesterday ("24h")', () => {
    it('counts since midnight of the previous day', () => {
        now('2026-10-11T12:00:00+02:00')
        const entries = [
            ...session('2026-10-09T08:00:00+02:00', '2026-10-09T10:00:00+02:00'),
            ...session('2026-10-10T08:00:00+02:00', '2026-10-10T10:00:00+02:00'),
            ...session('2026-10-11T08:00:00+02:00', '2026-10-11T09:00:00+02:00'),
        ]
        expect(query.yesterday(entries)).toBe('3 hours')
    })

    it('counts a session spanning two midnights from the limit on', () => {
        now('2026-10-11T10:00:00+02:00')
        expect(query.yesterday(session('2026-10-09T22:00:00+02:00', '2026-10-11T01:00:00+02:00'))).toBe('25 hours')
    })

    // 2026-10-25 has 25 hours in Europe/Berlin
    it('starts at midnight of the previous day after a DST switch', () => {
        now('2026-10-26T10:00:00+01:00')
        expect(query.yesterday(session('2026-10-25T00:00:00+02:00', '2026-10-25T00:30:00+02:00'))).toBe('30 minutes')
    })
})

describe('week', () => {
    it('counts today and the six days before', () => {
        now('2026-10-11T12:00:00+02:00')
        const entries = [
            ...session('2026-10-04T08:00:00+02:00', '2026-10-04T10:00:00+02:00'),
            ...session('2026-10-05T08:00:00+02:00', '2026-10-05T10:00:00+02:00'),
            ...session('2026-10-11T08:00:00+02:00', '2026-10-11T09:00:00+02:00'),
        ]
        expect(query.week(entries)).toBe('3 hours')
    })
})

describe('week (DST)', () => {
    it('starts at midnight six calendar days ago across a DST switch', () => {
        now('2026-10-27T12:00:00+01:00')
        expect(query.week(session('2026-10-21T00:00:00+02:00', '2026-10-21T00:30:00+02:00'))).toBe('30 minutes')
    })
})

describe('month', () => {
    it('counts today and the thirty days before', () => {
        now('2026-10-11T12:00:00+02:00')
        const entries = [
            ...session('2026-09-10T08:00:00+02:00', '2026-09-10T10:00:00+02:00'),
            ...session('2026-09-11T08:00:00+02:00', '2026-09-11T10:00:00+02:00'),
            ...session('2026-10-11T08:00:00+02:00', '2026-10-11T09:00:00+02:00'),
        ]
        expect(query.month(entries)).toBe('3 hours')
    })
})

describe('status', () => {
    it('is computed as of a given time', () => {
        now('2026-10-11T12:00:00+02:00')
        const entries = session('2026-10-11T08:00:00+02:00')
        expect(query.status(entries, moment('2026-10-11T10:00:00+02:00'))).toEqual({
            date: '2026-10-11T10:00:00+02:00',
            ever: '2 hours',
            month: '2 hours',
            week: '2 hours',
            '24h': '2 hours',
            today: '2 hours',
            current: '2 hours',
        })
    })
})

describe('since', () => {
    it('is zero without entries', () => {
        now('2026-10-11T12:00:00+02:00')
        expect(hours(query.since([], moment().subtract(8, 'hours')))).toBe(0)
    })

    it('is positive', () => {
        now('2026-10-11T12:00:00+02:00')
        expect(hours(query.since(session('2026-10-11T08:00:00+02:00', '2026-10-11T10:00:00+02:00')))).toBe(2)
    })

    it('counts a session starting exactly at the limit', () => {
        now('2026-10-11T12:00:00+02:00')
        const entries = session('2026-10-11T04:00:00+02:00', '2026-10-11T05:00:00+02:00')
        expect(hours(query.since(entries, moment().subtract(8, 'hours')))).toBe(1)
    })

    it('counts sessions after a non-midnight limit', () => {
        now('2026-10-11T12:00:00+02:00')
        const entries = [
            ...session('2026-10-11T02:00:00+02:00', '2026-10-11T03:00:00+02:00'),
            ...session('2026-10-11T05:00:00+02:00', '2026-10-11T07:00:00+02:00'),
            ...session('2026-10-11T11:00:00+02:00'),
        ]
        expect(hours(query.since(entries, moment().subtract(8, 'hours')))).toBe(3)
    })

    it('clips a session straddling a non-midnight limit at the limit', () => {
        now('2026-10-11T12:00:00+02:00')
        const entries = session('2026-10-11T03:00:00+02:00', '2026-10-11T05:00:00+02:00')
        expect(hours(query.since(entries, moment().subtract(8, 'hours')))).toBe(1)
    })

    it('clips a session straddling a limit before midnight at the limit', () => {
        now('2026-10-11T02:00:00+02:00')
        const entries = session('2026-10-10T17:00:00+02:00', '2026-10-11T01:00:00+02:00')
        expect(hours(query.since(entries, moment().subtract(8, 'hours')))).toBe(7)
    })
})

describe('report', () => {
    const entries = [
        ...session('2026-09-28T08:00:00+02:00', '2026-09-28T10:00:00+02:00'),
        ...session('2026-10-09T22:00:00+02:00', '2026-10-10T01:00:00+02:00'),
        ...session('2026-10-10T08:00:00+02:00', '2026-10-10T09:30:00+02:00'),
        ...session('2026-10-11T11:00:00+02:00'),
    ]

    it('reports per day, oldest first, including empty days', () => {
        now('2026-10-11T12:00:00+02:00')
        expect(query.report(entries, 'day', 3)).toEqual([
            {period: '2026-10-09', hours: 2, total: '2 hours'},
            {period: '2026-10-10', hours: 2.5, total: '2 hours, 30 minutes'},
            {period: '2026-10-11', hours: 1, total: '1 hour'},
        ])
    })

    it('reports per ISO week starting on Monday', () => {
        now('2026-10-11T12:00:00+02:00')
        expect(query.report(entries, 'week', 3)).toEqual([
            {period: '2026-W39', hours: 0, total: '0 seconds'},
            {period: '2026-W40', hours: 2, total: '2 hours'},
            {period: '2026-W41', hours: 5.5, total: '5 hours, 30 minutes'},
        ])
    })

    it('reports per month', () => {
        now('2026-10-11T12:00:00+02:00')
        expect(query.report(entries, 'month', 2)).toEqual([
            {period: '2026-09', hours: 2, total: '2 hours'},
            {period: '2026-10', hours: 5.5, total: '5 hours, 30 minutes'},
        ])
    })

    it('splits days at midnight across a DST switch', () => {
        now('2026-10-26T12:00:00+01:00')
        const dst = session('2026-10-24T23:00:00+02:00', '2026-10-25T04:00:00+01:00')
        expect(query.report(dst, 'day', 3).map(row => row.hours)).toEqual([1, 5, 0])
    })
})
