import * as path from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import actions from '../src/actions'
import * as repository from '../src/repository'
import {now, read, tmpdir, write} from './helpers'

let file: string

beforeEach(async () => {
    file = path.join(await tmpdir(), 'work.log')
    vi.useFakeTimers({toFake: ['Date', 'setTimeout', 'clearTimeout']})
    now('2026-10-11T12:00:00+02:00')
})

afterEach(() => {
    vi.useRealTimers()
})

async function settle<T>(promise: Promise<T>) {
    let done = false
    const result = promise.finally(() => (done = true))
    while (!done) {
        // Let file I/O progress on the real event loop and only move the clock when the action waits for a timer.
        await new Promise(resolve => setImmediate(resolve))
        if (vi.getTimerCount() > 0) await vi.advanceTimersToNextTimerAsync()
    }
    return await result
}

describe('start', () => {
    it('appends a start entry', async () => {
        await actions.start({file})
        expect(await read(file)).toBe('start 2026-10-11T12:00:00+02:00\n')
    })

    it('returns the status before starting', async () => {
        await write(file, ['start 2026-10-11T08:00:00+02:00', 'stop 2026-10-11T09:00:00+02:00'])
        expect(await actions.start({file})).toMatchObject({today: '1 hour', current: '0 seconds'})
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

    it('returns the status including the stopped session', async () => {
        await write(file, ['start 2026-10-11T10:00:00+02:00'])
        expect(await actions.stop({file})).toMatchObject({today: '2 hours', current: '2 hours'})
    })

    it('does nothing when already stopped', async () => {
        await write(file, ['start 2026-10-11T08:00:00+02:00', 'stop 2026-10-11T09:00:00+02:00'])
        await actions.stop({file})
        expect(await repository.load(file)).toHaveLength(2)
    })

    it('does nothing on an empty file', async () => {
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
        expect(await actions.status({file})).toEqual({
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
        expect(await actions.until({file, goal: '6h'})).toMatchObject({
            today: '2 hours',
            goal: '6 hours',
            remaining: '4 hours',
            until: '2026-10-11T16:00:00+02:00',
            since: '2026-10-11T00:00:00+02:00',
        })
    })

    it('reports zero when the goal is reached', async () => {
        await write(file, ['start 2026-10-11T04:00:00+02:00', 'stop 2026-10-11T11:00:00+02:00'])
        expect(await actions.until({file, goal: '6h'})).toMatchObject({goal: '6 hours', remaining: 0})
    })

    it('respects --since', async () => {
        await write(file, [
            'start 2026-10-11T01:00:00+02:00',
            'stop 2026-10-11T02:00:00+02:00',
            'start 2026-10-11T09:00:00+02:00',
            'stop 2026-10-11T11:00:00+02:00',
        ])
        expect(await actions.until({file, goal: '6h', since: '8h'})).toMatchObject({
            remaining: '4 hours',
            since: '2026-10-11T04:00:00+02:00',
        })
    })
})

describe('focus', () => {
    it('tracks until the goal is reached', async () => {
        const ticks: number[] = []
        const status = await settle(
            actions.focus({file, goal: '3s'}, {onTick: remaining => ticks.push(remaining.asSeconds())})
        )

        const entries = await repository.load(file)
        expect(entries.map(entry => entry.type)).toEqual([repository.START, repository.STOP])
        expect(entries[1].date.diff(entries[0].date)).toBeGreaterThanOrEqual(3000)
        expect(ticks).toEqual([3, 2, 1])
        expect(status).toMatchObject({current: '3 seconds'})
    })

    it('reports the goal on start', async () => {
        const onStart = vi.fn()
        await settle(actions.focus({file, goal: '1s'}, {onStart}))
        expect(onStart).toHaveBeenCalledWith({goal: '1 second', until: '2026-10-11T12:00:01+02:00'})
    })

    it('stops when aborted', async () => {
        const controller = new AbortController()
        const focus = actions.focus({file, goal: '1h'}, {signal: controller.signal, onTick: () => controller.abort()})
        await settle(focus)

        const entries = await repository.load(file)
        expect(entries.map(entry => entry.type)).toEqual([repository.START, repository.STOP])
        expect(entries[1].date.diff(entries[0].date)).toBeLessThan(1000)
    })

    it('rejects an invalid goal', async () => {
        await expect(actions.focus({file, goal: 'banana'})).rejects.toThrow('cannot be parsed')
    })

    it('does not start tracking when the goal is invalid', async () => {
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
