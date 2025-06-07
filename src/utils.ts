import moment from 'moment/moment'
import humanizeDuration from 'humanize-duration'

export function hae<T>(action: (options: T) => Promise<any>): (options: T) => Promise<void> {
    return async (options: T) => {
        try {
            await action(options)
        } catch (e) {
            console.log(e)
            process.exit(1)
        }
    }
}

export function last(list: any[]) {
    if (!list.length) return
    return list[list.length - 1]
}

export function empty(list: any[]) {
    return list.length === 0
}

export function date() {
    return moment().format()
}

export function humanize(duration: moment.Duration) {
    return humanizeDuration(duration.asMilliseconds(), {units: ['h', 'm', 's'], round: true, largest: 2})
}
