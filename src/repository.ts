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

/**
 * The file of a mark is the default file with "-<mark>" appended to its name, e.g., "~/stoetzms-work-project.log".
 */
export function locate(file?: string, mark?: string) {
    if (mark === undefined) return file
    if (file !== undefined) throw new Error('Use either --file or --mark')
    if (!/^[\w-]+$/.test(mark)) throw new Error(`"${mark}" is not a valid mark (letters, digits, "_" and "-")`)

    const {dir, name, ext} = path.parse(resolve())
    return path.join(dir, `${name}-${mark}${ext}`)
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

export async function add(type: string, file?: string, date = moment()) {
    await fs.appendFile(resolve(file), type + ' ' + date.format() + '\n')
}

function lines(data: string) {
    const result = data.split(/\r?\n/)
    while (result.length && result.at(-1)!.trim() === '') result.pop()
    return result
}

/**
 * The last entry as written in the file, if any.
 */
export async function latest(file?: string) {
    return lines(await raw(file))
        .at(-1)
        ?.trim()
}

/**
 * Removes the last entry. The file is replaced atomically.
 */
export async function pop(file?: string) {
    const remaining = lines(await raw(file))
    if (!remaining.length) throw new Error('Nothing to revert ...')
    remaining.pop()

    const target = resolve(file)
    const tmp = `${target}.${process.pid}.tmp`
    await fs.writeFile(tmp, remaining.map(it => it + '\n').join(''))
    await fs.rename(tmp, target)
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
