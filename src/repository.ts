import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import moment from 'moment'
import {spawnSync} from 'node:child_process'
import * as config from './config'

export const START = 'start'
export const STOP = 'stop'
export const FILE_DEFAULT = path.join(os.homedir(), 'stoetzms-work.log')

export type Entry = {
    type: string
    date: moment.Moment
}

/**
 * Falls back to the config and then to FILE_DEFAULT. Expands a leading "~", since only the shell does that and not for
 * "--file=~/...".
 */
export function resolve(file?: string) {
    file = file ?? config.load().file ?? FILE_DEFAULT
    if (file === '~') return os.homedir()
    if (file.startsWith('~/') || file.startsWith('~' + path.sep)) return path.join(os.homedir(), file.slice(2))
    return file
}

export async function exists(file?: string) {
    return await fs
        .access(resolve(file))
        .then(() => true)
        .catch(() => false)
}

export async function raw(file?: string) {
    if (await exists(file)) return (await fs.readFile(resolve(file))).toString()
    return ''
}

export async function load(file?: string) {
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

export async function add(type: string, file?: string) {
    await fs.appendFile(resolve(file), type + ' ' + moment().format() + '\n')
}

export function edit(file?: string) {
    const [command, ...args] = config.editor().trim().split(/\s+/)
    // Windows needs a shell to find "code.cmd" and alike
    const result = spawnSync(command, [...args, resolve(file)], {stdio: 'inherit', shell: process.platform === 'win32'})
    if (result.error) throw result.error
    if (result.status !== 0) throw new Error(`Editor "${command}" exited with ${result.status}`)
}

export async function drop(file?: string) {
    if (await exists(file)) await fs.unlink(resolve(file))
}
