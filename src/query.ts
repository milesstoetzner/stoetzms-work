import moment from 'moment'
import * as utils from './utils'
import * as repository from './repository'

export function current(entries: repository.Entry[]) {
    const duration = moment.duration()

    if (!utils.empty(entries)) {
        const latest = utils.last(entries)
        if (latest.type === repository.START) {
            duration.add(latest.date.diff(moment()))
        }
    }

    return utils.humanize(duration)
}

export function today(entries: repository.Entry[]) {
    return utils.humanize(since(entries, moment().millisecond(0).second(0).minute(0).hour(0)))
}

export function yesterday(entries: repository.Entry[]) {
    return utils.humanize(since(entries, moment().millisecond(0).second(0).minute(0).hour(0).subtract(24, 'hours')))
}

export function ever(entries: repository.Entry[]) {
    const duration = moment.duration()

    if (!utils.empty(entries)) {
        for (let index = 0; index + 1 < entries.length; index += 2) {
            const start = entries[index]
            const stop = entries[index + 1]
            duration.add(start.date.diff(stop.date))
        }

        const latest = utils.last(entries)
        if (latest.type === repository.START) {
            duration.add(latest.date.diff(moment()))
        }
    }

    return utils.humanize(duration)
}

export function week(entries: repository.Entry[]) {
    return utils.humanize(since(entries, moment().millisecond(0).second(0).minute(0).hour(0).subtract(6, 'days')))
}

export function month(entries: repository.Entry[]) {
    return utils.humanize(since(entries, moment().millisecond(0).second(0).minute(0).hour(0).subtract(30, 'days')))
}

export function since(entries: repository.Entry[], limit: moment.Moment) {
    const duration = moment.duration()

    // Traverse entries in reverse order
    for (let index = entries.length - 1; index >= 0; index--) {
        const start = entries[index]
        let stop = entries[index + 1]
        if (start.type === repository.STOP) continue

        // Find session before or at limit
        if (start.date.isBefore(limit)) {
            if (!stop) {
                // If working across midnight
                stop = {
                    type: repository.STOP,
                    date: moment(),
                }
            }

            if (stop.date.isBefore(limit)) break
            duration.add(stop.date.clone().millisecond(0).second(0).minute(0).hour(0).diff(stop.date))
            break
        }

        // Every session within limit
        if (start.date.isAfter(limit)) {
            if (index === entries.length - 1) {
                // If still running
                duration.add(start.date.diff(moment()))
            } else {
                duration.add(start.date.diff(stop.date))
            }
        }
    }

    return duration
}
