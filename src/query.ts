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
export function sessions(entries: repository.Entry[]): Session[] {
    const now = moment()
    const result = []
    for (let index = 0; index < entries.length; index += 2) {
        result.push({
            start: entries[index].date,
            stop: entries[index + 1]?.date ?? now,
        })
    }
    return result
}

export function status(entries: repository.Entry[]) {
    return {
        date: utils.date(),
        ever: ever(entries),
        month: month(entries),
        week: week(entries),
        '24h': yesterday(entries),
        today: today(entries),
        current: current(entries),
    }
}

export function current(entries: repository.Entry[]) {
    const duration = moment.duration()

    const latest = utils.last(entries)
    if (latest && latest.type === repository.START) {
        duration.add(moment().diff(latest.date))
    }

    return utils.humanize(duration)
}

export function today(entries: repository.Entry[]) {
    return utils.humanize(since(entries, moment().startOf('day')))
}

export function yesterday(entries: repository.Entry[]) {
    return utils.humanize(since(entries, moment().startOf('day').subtract(1, 'day')))
}

export function ever(entries: repository.Entry[]) {
    return utils.humanize(since(entries))
}

export function week(entries: repository.Entry[]) {
    return utils.humanize(since(entries, moment().startOf('day').subtract(6, 'days')))
}

export function month(entries: repository.Entry[]) {
    return utils.humanize(since(entries, moment().startOf('day').subtract(30, 'days')))
}

/**
 * Sums the time worked after limit. Each session is clipped to [limit, now], so a session that started before limit
 * only counts from limit on.
 */
export function since(entries: repository.Entry[], limit?: moment.Moment) {
    const duration = moment.duration()

    for (const session of sessions(entries)) {
        const start = limit ? moment.max(session.start, limit) : session.start
        if (session.stop.isAfter(start)) duration.add(session.stop.diff(start))
    }

    return duration
}
