import yaml from 'js-yaml'
import * as path from 'node:path'
import {afterEach, beforeEach, describe, expect, it, MockInstance, vi} from 'vitest'
import actions from '../src/actions'
import * as repository from '../src/repository'
import {now, read, tmpdir, write} from './helpers'

let file: string
let log: MockInstance<typeof console.log>
let sigint: NodeJS.SignalsListener[]

beforeEach(async () => {
    file = path.join(await tmpdir(), 'work.log')
    vi.useFakeTimers({toFake: ['Date', 'setTimeout', 'clearTimeout']})
    now('2026-10-11T12:00:00+02:00')
    log = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    sigint = process.listeners('SIGINT')
})

afterEach(() => {
    for (const listener of process.listeners('SIGINT')) {
        if (!sigint.includes(listener)) process.removeListener('SIGINT', listener)
    }
    vi.useRealTimers()
    vi.restoreAllMocks()
})

function output(): any {
    return yaml.load(log.mock.calls.at(-1)![0])
}

describe('start', () => {
    it('appends a start entry', async () => {
        await actions.start({file})
        expect(await read(file)).toBe('start 2026-10-11T12:00:00+02:00\n')
    })

    it('refuses to start twice', async () => {
        await actions.start({file})
        await expect(actions.start({file})).rejects.toThrow('Already started')
        expect(await repository.load(file)).toHaveLength(1)
    })
})

describe('stop', () => {
    it('appends a stop entry', async () => {
        await actions.start({file})
        now('2026-10-11T13:00:00+02:00')
        await actions.stop({file})
        expect(await read(file)).toBe('start 2026-10-11T12:00:00+02:00\nstop 2026-10-11T13:00:00+02:00\n')
    })

    it('does nothing when already stopped', async () => {
        await write(file, ['start 2026-10-11T08:00:00+02:00', 'stop 2026-10-11T09:00:00+02:00'])
        await actions.stop({file})
        expect(await repository.load(file)).toHaveLength(2)
    })

    // BUG: stop on an empty file writes "stop ..." as first line, after which every command fails with "Index 0 not START".
    it.fails('does not corrupt an empty file', async () => {
        await actions.stop({file})
        await expect(repository.load(file)).resolves.toEqual([])
    })
})

describe('status', () => {
    it('reports all aggregates', async () => {
        await write(file, [
            'start 2026-10-10T08:00:00+02:00',
            'stop 2026-10-10T10:00:00+02:00',
            'start 2026-10-11T10:00:00+02:00',
        ])
        await actions.status({file})
        expect(output()).toEqual({
            date: '2026-10-11T12:00:00+02:00',
            ever: '4 hours',
            month: '4 hours',
            week: '4 hours',
            '24h': '4 hours',
            today: '2 hours',
            current: '2 hours',
        })
    })
})

describe('until', () => {
    it('reports the remaining time of today', async () => {
        await write(file, ['start 2026-10-11T08:00:00+02:00', 'stop 2026-10-11T10:00:00+02:00'])
        await actions.until({file, goal: '6h'})
        expect(output()).toEqual({
            goal: '6 hours',
            remaining: '4 hours',
            until: '2026-10-11T16:00:00+02:00',
            since: '2026-10-11T00:00:00+02:00',
        })
    })

    it('reports zero when the goal is reached', async () => {
        await write(file, ['start 2026-10-11T04:00:00+02:00', 'stop 2026-10-11T11:00:00+02:00'])
        await actions.until({file, goal: '6h'})
        expect(output()).toMatchObject({goal: '6 hours', remaining: 0})
    })

    it('respects --since', async () => {
        await write(file, [
            'start 2026-10-11T01:00:00+02:00',
            'stop 2026-10-11T02:00:00+02:00',
            'start 2026-10-11T09:00:00+02:00',
            'stop 2026-10-11T11:00:00+02:00',
        ])
        await actions.until({file, goal: '6h', since: '8h'})
        expect(output()).toMatchObject({remaining: '4 hours', since: '2026-10-11T04:00:00+02:00'})
    })
})

describe('focus', () => {
    it('tracks until the goal is reached', async () => {
        let done = false
        const focus = actions.focus({file, goal: '3s'}).then(() => (done = true))
        while (!done) {
            await new Promise(resolve => setImmediate(resolve))
            await vi.advanceTimersByTimeAsync(500)
        }
        await focus

        const entries = await repository.load(file)
        expect(entries.map(entry => entry.type)).toEqual([repository.START, repository.STOP])
        expect(entries[1].date.diff(entries[0].date)).toBeGreaterThanOrEqual(3000)
    })

    it('rejects an invalid goal', async () => {
        await expect(actions.focus({file, goal: 'banana'})).rejects.toThrow('cannot be parsed')
    })

    // BUG: the goal is parsed after tracking started, so an invalid goal leaves a dangling session.
    it.fails('does not start tracking when the goal is invalid', async () => {
        await actions.focus({file, goal: 'banana'}).catch(() => {})
        expect(await repository.load(file)).toEqual([])
    })
})

describe('drop', () => {
    it('requires --dangerous', async () => {
        await write(file, ['start 2026-10-11T08:00:00+02:00'])
        await expect(actions.drop({file, dangerous: false})).rejects.toThrow('Dangerous')
        expect(await repository.exists(file)).toBe(true)
    })

    it('deletes the file', async () => {
        await write(file, ['start 2026-10-11T08:00:00+02:00'])
        await actions.drop({file, dangerous: true})
        expect(await repository.exists(file)).toBe(false)
    })
})
