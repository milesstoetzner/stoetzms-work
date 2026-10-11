import * as path from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import actions from '../src/actions'
import * as repository from '../src/repository'
import * as utils from '../src/utils'
import {now, read, tmpdir, write} from './helpers'

vi.mock('../src/utils', async original => ({...(await original<typeof utils>()), confirm: vi.fn()}))

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

    it('starts at a given time', async () => {
        await actions.start({file, at: '09:15'})
        expect(await read(file)).toBe('start 2026-10-11T09:15:00+02:00\n')
    })

    it('returns the status as of the given time', async () => {
        await write(file, ['start 2026-10-11T08:00:00+02:00', 'stop 2026-10-11T09:00:00+02:00'])
        expect(await actions.start({file, at: '10:00'})).toMatchObject({
            date: '2026-10-11T10:00:00+02:00',
            today: '1 hour',
        })
    })

    it('refuses to start before the last stop', async () => {
        await write(file, ['start 2026-10-11T08:00:00+02:00', 'stop 2026-10-11T09:00:00+02:00'])
        await expect(actions.start({file, at: '08:30'})).rejects.toThrow('Cannot start before the last stop')
        expect(await repository.load(file)).toHaveLength(2)
    })

    it('refuses an invalid time', async () => {
        await expect(actions.start({file, at: 'soon'})).rejects.toThrow('is neither HH:mm nor an ISO 8601 date')
        expect(await repository.exists(file)).toBe(false)
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

    it('stops at a given time', async () => {
        await write(file, ['start 2026-10-11T08:00:00+02:00'])
        expect(await actions.stop({file, at: '11:30'})).toMatchObject({
            today: '3 hours, 30 minutes',
            current: '3 hours, 30 minutes',
        })
        expect((await repository.load(file))[1].date.format()).toBe('2026-10-11T11:30:00+02:00')
    })

    it('stops a session running across midnight at a time before midnight', async () => {
        now('2026-10-11T00:30:00+02:00')
        await write(file, ['start 2026-10-10T20:00:00+02:00'])
        await actions.stop({file, at: '23:00'})
        expect((await repository.load(file))[1].date.format()).toBe('2026-10-10T23:00:00+02:00')
    })

    it('refuses to stop before the start', async () => {
        await write(file, ['start 2026-10-11T08:00:00+02:00'])
        await expect(actions.stop({file, at: '07:00'})).rejects.toThrow('Cannot stop before the start')
        expect(await repository.load(file)).toHaveLength(1)
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

describe('revert', () => {
    beforeEach(() => {
        vi.mocked(utils.confirm).mockReset()
    })

    it('discards the running session when confirmed', async () => {
        vi.mocked(utils.confirm).mockResolvedValue(true)
        await write(file, [
            'start 2026-10-11T08:00:00+02:00',
            'stop 2026-10-11T09:00:00+02:00',
            '',
            'start 2026-10-11T11:00:00+02:00',
            '',
        ])
        expect(await actions.revert({file})).toMatchObject({
            today: '1 hour',
            current: '0 seconds',
            reverted: 'start 2026-10-11T11:00:00+02:00',
        })
        expect(utils.confirm).toHaveBeenCalledWith('Delete "start 2026-10-11T11:00:00+02:00"? [y/N] ')
        expect(await read(file)).toBe('start 2026-10-11T08:00:00+02:00\nstop 2026-10-11T09:00:00+02:00\n\n')
    })

    it('resumes the session when reverting a stop', async () => {
        await write(file, ['start 2026-10-11T08:00:00+02:00', 'stop 2026-10-11T09:00:00+02:00'])
        expect(await actions.revert({file, yes: true})).toMatchObject({
            today: '4 hours',
            current: '4 hours',
            reverted: 'stop 2026-10-11T09:00:00+02:00',
        })
        expect(await read(file)).toBe('start 2026-10-11T08:00:00+02:00\n')
    })

    it('empties a file with a single entry', async () => {
        await write(file, ['start 2026-10-11T11:00:00+02:00'])
        await actions.revert({file, yes: true})
        expect(await read(file)).toBe('')
    })

    it('keeps the entry when not confirmed', async () => {
        vi.mocked(utils.confirm).mockResolvedValue(false)
        await write(file, ['start 2026-10-11T08:00:00+02:00', 'stop 2026-10-11T09:00:00+02:00'])
        await expect(actions.revert({file})).rejects.toThrow('Aborted')
        expect(await repository.load(file)).toHaveLength(2)
    })

    it('does not ask with yes', async () => {
        await write(file, ['start 2026-10-11T08:00:00+02:00'])
        await actions.revert({file, yes: true})
        expect(utils.confirm).not.toHaveBeenCalled()
    })

    it('refuses on an empty file', async () => {
        await expect(actions.revert({file})).rejects.toThrow('Nothing to revert')
        expect(utils.confirm).not.toHaveBeenCalled()
        expect(await repository.exists(file)).toBe(false)
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
    beforeEach(() => {
        vi.mocked(utils.confirm).mockReset()
    })

    it('deletes the file when confirmed', async () => {
        vi.mocked(utils.confirm).mockResolvedValue(true)
        await write(file, ['start 2026-10-11T08:00:00+02:00'])
        await actions.drop({file})
        expect(utils.confirm).toHaveBeenCalledWith(`Delete ${file}? [y/N] `)
        expect(await repository.exists(file)).toBe(false)
    })

    it('keeps the file when not confirmed', async () => {
        vi.mocked(utils.confirm).mockResolvedValue(false)
        await write(file, ['start 2026-10-11T08:00:00+02:00'])
        await expect(actions.drop({file})).rejects.toThrow('Aborted')
        expect(await repository.exists(file)).toBe(true)
    })

    it('does not ask with yes', async () => {
        await write(file, ['start 2026-10-11T08:00:00+02:00'])
        await actions.drop({file, yes: true})
        expect(utils.confirm).not.toHaveBeenCalled()
        expect(await repository.exists(file)).toBe(false)
    })

    it('does not ask if there is no file', async () => {
        await actions.drop({file})
        expect(utils.confirm).not.toHaveBeenCalled()
    })
})
