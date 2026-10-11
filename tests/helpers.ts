import moment from 'moment'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import {vi} from 'vitest'
import * as repository from '../src/repository'

export function entry(type: string, date: string): repository.Entry {
    return {type, date: moment(date)}
}

export function session(start: string, stop?: string): repository.Entry[] {
    const entries = [entry(repository.START, start)]
    if (stop) entries.push(entry(repository.STOP, stop))
    return entries
}

export function now(date: string) {
    vi.setSystemTime(new Date(date))
}

export function hours(duration: moment.Duration) {
    return duration.asHours()
}

export async function tmpdir() {
    return await fs.mkdtemp(path.join(os.tmpdir(), 'stoetzms-work-'))
}

export async function write(file: string, lines: string[]) {
    await fs.writeFile(file, lines.map(it => it + '\n').join(''))
}

export async function read(file: string) {
    return (await fs.readFile(file)).toString()
}
