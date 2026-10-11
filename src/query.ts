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
    const duration = moment.duration()

    for (const session of sessions(entries, now)) {
        const start = limit ? moment.max(session.start, limit) : session.start
        const stop = moment.min(session.stop, now)
        if (stop.isAfter(start)) duration.add(stop.diff(start))
    }

    return duration
}
