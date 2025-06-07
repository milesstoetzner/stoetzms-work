import * as fs from 'node:fs/promises'
import moment from 'moment'
import {execSync} from 'node:child_process'

export const START = 'start'
export const STOP = 'stop'

export type Entry = {
    type: string
    date: moment.Moment
}

export async function exists(file: string) {
    return await fs
        .access(file)
        .then(() => true)
        .catch(() => false)
}

export async function raw(file: string) {
    if (await exists(file)) return (await fs.readFile(file)).toString()
    return ''
}

export async function load(file: string) {
    const data = await raw(file)

    const entries = []
    for (const [index, line] of data
        .split(/\r?\n/)
        .filter(it => it !== '')
        .entries()) {
        const tmp = line.split(' ')

        if (index % 2 === 0) {
            if (tmp[0] !== START) throw new Error(`Index ${index} not START`)
        }

        if (index % 2 === 1) {
            if (tmp[0] !== STOP) throw new Error(`Index ${index} not STOP`)
        }

        entries.push({
            type: tmp[0],
            date: moment(tmp[1]),
        })
    }

    return entries
}

export async function add(file: string, type: string) {
    await fs.appendFile(file, type + ' ' + moment().format() + '\n')
}

export function edit(file: string) {
    execSync('code ' + file)
}

export async function drop(file: string) {
    if (await exists(file)) await fs.unlink(file)
}
