import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import moment from 'moment'
import {execSync} from 'node:child_process'

export const START = 'start'
export const STOP = 'stop'
export const FILE_DEFAULT = path.join(os.homedir(), 'stoetzms-work.log')

export type Entry = {
    type: string
    date: moment.Moment
}

/**
 * Expands a leading "~", since only the shell does that and not for "--file=~/...".
 */
export function resolve(file = FILE_DEFAULT) {
    if (file === '~') return os.homedir()
    if (file.startsWith('~/') || file.startsWith('~' + path.sep)) return path.join(os.homedir(), file.slice(2))
    return file
}

export async function exists(file = FILE_DEFAULT) {
    return await fs
        .access(resolve(file))
        .then(() => true)
        .catch(() => false)
}

export async function raw(file = FILE_DEFAULT) {
    if (await exists(file)) return (await fs.readFile(resolve(file))).toString()
    return ''
}

export async function load(file = FILE_DEFAULT) {
    return parse(await raw(file), resolve(file))
}

/**
 * Parses the log. Entries must alternate between start and stop, each with an ISO 8601 date, in chronological order.
 */
export function parse(data: string, file = FILE_DEFAULT) {
    const entries: Entry[] = []
    for (const [index, line] of data.split(/\r?\n/).entries()) {
        if (line.trim() === '') continue
        const fail = (reason: string) => {
            throw new Error(`${file}:${index + 1}: ${reason}: "${line}"`)
        }

        const fields = line.trim().split(/\s+/)
        if (fields.length !== 2) fail('expected "<start|stop> <date>"')
        const [type, value] = fields

        const expected = entries.length % 2 === 0 ? START : STOP
        if (type !== expected) fail(`expected ${expected}`)

        const date = moment(value, moment.ISO_8601, true)
        if (!date.isValid()) fail('invalid date')

        const previous = entries.at(-1)
        if (previous && date.isBefore(previous.date)) fail(`date before previous ${previous.type}`)

        entries.push({type, date})
    }

    return entries
}

export async function add(type: string, file = FILE_DEFAULT) {
    await fs.appendFile(resolve(file), type + ' ' + moment().format() + '\n')
}

export function edit(file = FILE_DEFAULT) {
    execSync('code ' + resolve(file))
}

export async function drop(file = FILE_DEFAULT) {
    if (await exists(file)) await fs.unlink(resolve(file))
}
