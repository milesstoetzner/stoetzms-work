import * as os from 'node:os'
import * as path from 'node:path'
import {beforeEach, describe, expect, it} from 'vitest'
import * as repository from '../src/repository'
import {read, tmpdir, write} from './helpers'

let file: string

beforeEach(async () => {
    file = path.join(await tmpdir(), 'work.log')
})

describe('repository', () => {
    it('treats a missing file as empty', async () => {
        expect(await repository.exists(file)).toBe(false)
        expect(await repository.raw(file)).toBe('')
        expect(await repository.load(file)).toEqual([])
    })

    it('loads alternating entries and ignores blank lines and CRLF', async () => {
        await write(file, [
            'start 2026-10-11T08:00:00+02:00\r',
            'stop 2026-10-11T09:00:00+02:00',
            '',
            'start 2026-10-11T10:00:00+02:00',
        ])
        const entries = await repository.load(file)
        expect(entries.map(entry => entry.type)).toEqual([repository.START, repository.STOP, repository.START])
        expect(entries[1].date.toISOString()).toBe('2026-10-11T07:00:00.000Z')
    })

    it('loads the bundled sample log', async () => {
        const entries = await repository.load(path.join(__dirname, 'test.log'))
        expect(entries).toHaveLength(16)
    })

    it('rejects a file not starting with start', async () => {
        await write(file, ['stop 2026-10-11T09:00:00+02:00'])
        await expect(repository.load(file)).rejects.toThrow('Index 0 not START')
    })

    it('rejects two starts in a row', async () => {
        await write(file, ['start 2026-10-11T08:00:00+02:00', 'start 2026-10-11T09:00:00+02:00'])
        await expect(repository.load(file)).rejects.toThrow('Index 1 not STOP')
    })

    // BUG: a missing or malformed date is accepted (moment(undefined) is "now", moment('garbage') is invalid).
    it.fails('rejects an entry without a valid date', async () => {
        await write(file, ['start'])
        await expect(repository.load(file)).rejects.toThrow()
    })

    // BUG: entries are not checked to be in chronological order.
    it.fails('rejects a stop before its start', async () => {
        await write(file, ['start 2026-10-11T10:00:00+02:00', 'stop 2026-10-11T09:00:00+02:00'])
        await expect(repository.load(file)).rejects.toThrow()
    })

    it('appends entries', async () => {
        await repository.add(repository.START, file)
        await repository.add(repository.STOP, file)
        expect(await read(file)).toMatch(/^start \S+\nstop \S+\n$/)
        expect(await repository.load(file)).toHaveLength(2)
    })

    it('drops the file', async () => {
        await repository.add(repository.START, file)
        await repository.drop(file)
        expect(await repository.exists(file)).toBe(false)
        await repository.drop(file)
    })

    it('defaults to a file in the home directory', () => {
        expect(repository.resolve()).toBe(path.join(os.homedir(), 'stoetzms-work.log'))
    })

    it('expands a leading tilde', () => {
        expect(repository.resolve('~/work.log')).toBe(path.join(os.homedir(), 'work.log'))
        expect(repository.resolve('/tmp/~/work.log')).toBe('/tmp/~/work.log')
        expect(repository.resolve('work.log')).toBe('work.log')
    })
})
