import moment from 'moment'
import * as utils from './utils'
import * as repository from './repository'

export type Session = {
    start: moment.Moment
    stop: moment.Moment
}

/**
 * Pairs start and stop entries into sessions. A running session stops now.
 */
export function sessions(entries: repository.Entry[], now = moment()): Session[] {
    const result = []
    for (let index = 0; index < entries.length; index += 2) {
        result.push({
            start: entries[index].date,
            stop: entries[index + 1]?.date ?? now,
        })
    }
    return result
}

/**
 * The status as of now, which defaults to the current time.
 */
export function status(entries: repository.Entry[], now = moment()) {
    return {
        date: now.format(),
        ever: ever(entries, now),
        month: month(entries, now),
        week: week(entries, now),
        '24h': yesterday(entries, now),
        today: today(entries, now),
        current: current(entries, now),
    }
}

export function current(entries: repository.Entry[], now = moment()) {
    const duration = moment.duration()

    const latest = utils.last(entries)
    if (latest && latest.type === repository.START) {
        duration.add(now.diff(latest.date))
    }

    return utils.humanize(duration)
}

export function today(entries: repository.Entry[], now = moment()) {
    return utils.humanize(since(entries, now.clone().startOf('day'), now))
}

export function yesterday(entries: repository.Entry[], now = moment()) {
    return utils.humanize(since(entries, now.clone().startOf('day').subtract(1, 'day'), now))
}

export function ever(entries: repository.Entry[], now = moment()) {
    return utils.humanize(since(entries, undefined, now))
}

export function week(entries: repository.Entry[], now = moment()) {
    return utils.humanize(since(entries, now.clone().startOf('day').subtract(6, 'days'), now))
}

export function month(entries: repository.Entry[], now = moment()) {
    return utils.humanize(since(entries, now.clone().startOf('day').subtract(30, 'days'), now))
}

/**
 * Sums the time worked after limit. Each session is clipped to [limit, now], so a session that started before limit
 * only counts from limit on and nothing after now counts.
 */
export function since(entries: repository.Entry[], limit?: moment.Moment, now = moment()) {
    return between(entries, limit, now, now)
}

/**
 * Sums the time worked in [from, to]. Sessions are clipped to the interval and a running session stops now.
 */
export function between(entries: repository.Entry[], from?: moment.Moment, to = moment(), now = moment()) {
    const duration = moment.duration()

    for (const session of sessions(entries, now)) {
        const start = from ? moment.max(session.start, from) : session.start
        const stop = moment.min(session.stop, to)
        if (stop.isAfter(start)) duration.add(stop.diff(start))
    }

    return duration
}

export const PERIODS = {
    day: {unit: 'day', label: 'YYYY-MM-DD'},
    week: {unit: 'isoWeek', label: 'GGGG-[W]WW'},
    month: {unit: 'month', label: 'YYYY-MM'},
} as const

export type Period = keyof typeof PERIODS

export type Row = {
    period: string
    hours: number
    total: string
}

/**
 * The time worked per period for the last periods up to and including the current one, oldest first.
 */
export function report(entries: repository.Entry[], period: Period, last: number, now = moment()): Row[] {
    const {unit, label} = PERIODS[period]
    const step = unit === 'isoWeek' ? 'week' : unit

    const rows = []
    for (let index = last - 1; index >= 0; index--) {
        const from = now.clone().startOf(unit).subtract(index, step)
        const to = from.clone().add(1, step)
        const duration = between(entries, from, to, now)
        rows.push({
            period: from.format(label),
            hours: Math.round(duration.asHours() * 100) / 100,
            total: utils.humanize(duration),
        })
    }
    return rows
}
