import moment from 'moment/moment'
import humanizeDuration from 'humanize-duration'
import parseDuration from 'parse-duration'

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

export function numerize(duration: string): number {
    const data = parseDuration(duration)
    if (!Number.isInteger(data)) throw new Error(`"${duration}" cannot be parsed as duration`)
    return data
}

export function beep() {
    process.stdout.write('\x07')
}

export function sleep(ms = 1000) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
