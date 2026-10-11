import moment from 'moment'
import humanizeDuration from 'humanize-duration'
import parseDuration from 'parse-duration'
import yaml from 'js-yaml'
import * as readline from 'node:readline/promises'

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
    if (data === null || !Number.isInteger(data)) throw new Error(`"${duration}" cannot be parsed as duration`)
    return data
}

export function beep() {
    process.stdout.write('\x07')
}

/**
 * Resolves after ms or as soon as the signal is aborted.
 */
export function sleep(ms = 1000, signal?: AbortSignal) {
    return new Promise<void>(resolve => {
        if (signal?.aborted) return resolve()
        const done = () => {
            clearTimeout(timer)
            signal?.removeEventListener('abort', done)
            resolve()
        }
        const timer = setTimeout(done, ms)
        signal?.addEventListener('abort', done)
    })
}

/**
 * Prints strings as is and everything else as YAML.
 */
export function print(data: unknown) {
    if (data === undefined) return
    if (typeof data === 'string') return console.log(data)
    console.log(yaml.dump(data))
}

/**
 * Asks a yes/no question. Anything but "y" or "yes", including closed input, is a no.
 */
export async function confirm(
    question: string,
    input: NodeJS.ReadableStream = process.stdin,
    output: NodeJS.WritableStream = process.stdout
) {
    const rl = readline.createInterface({input, output})
    try {
        const answer = await new Promise<string>(resolve => {
            rl.on('close', () => resolve(''))
            rl.question(question).then(resolve, () => resolve(''))
        })
        return /^y(es)?$/i.test(answer.trim())
    } finally {
        rl.close()
    }
}
