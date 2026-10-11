import yaml from 'js-yaml'
import moment from 'moment'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {day, Workspace} from './helpers'

vi.setConfig({testTimeout: 30_000})

let ws: Workspace

beforeEach(async () => {
    ws = await Workspace.create()
})

function status(stdout: string): Record<string, string> {
    return yaml.load(stdout) as Record<string, string>
}

describe('start and stop', () => {
    it('tracks a session', async () => {
        const start = await ws.run(['start', '--at', day(-2, '08:00')])
        expect(start).toMatchObject({code: 0, stderr: ''})
        expect(status(start.stdout)).toMatchObject({ever: '0 seconds', current: '0 seconds'})

        const stop = await ws.run(['stop', '--at', day(-2, '09:30')])
        expect(stop).toMatchObject({code: 0, stderr: ''})
        expect(status(stop.stdout)).toMatchObject({ever: '1 hour, 30 minutes', current: '1 hour, 30 minutes'})

        expect(await ws.read()).toBe(`start ${day(-2, '08:00')}\nstop ${day(-2, '09:30')}\n`)
        expect(status((await ws.run(['status'])).stdout)).toMatchObject({
            ever: '1 hour, 30 minutes',
            current: '0 seconds',
        })
    })

    it('starts now by default', async () => {
        const before = moment().startOf('second')
        await ws.run(['start'])
        const date = moment((await ws.read()).split(' ')[1].trim())
        expect(date.isSameOrAfter(before)).toBe(true)
        expect(date.isSameOrBefore(moment())).toBe(true)
        expect(status((await ws.run(['status'])).stdout).current).toMatch(/^\d+ seconds?$/)
    })

    it('refuses to start twice', async () => {
        await ws.run(['start', '--at', day(-1, '08:00')])
        const result = await ws.run(['start'])
        expect(result).toEqual({code: 1, stdout: '', stderr: 'Error: Already started ...\n'})
        expect(await ws.read()).toBe(`start ${day(-1, '08:00')}\n`)
    })

    it('does nothing when stopping while stopped', async () => {
        await ws.write([`start ${day(-1, '08:00')}`, `stop ${day(-1, '09:00')}`])
        expect((await ws.run(['stop'])).code).toBe(0)
        expect(await ws.read()).toBe(`start ${day(-1, '08:00')}\nstop ${day(-1, '09:00')}\n`)
    })

    it('does nothing when stopping an empty log', async () => {
        expect((await ws.run(['stop'])).code).toBe(0)
        expect(await ws.exists()).toBe(false)
    })

    it('rejects a stop before the start', async () => {
        await ws.write([`start ${day(-1, '08:00')}`])
        const result = await ws.run(['stop', '--at', day(-1, '07:00')])
        expect(result.code).toBe(1)
        expect(result.stderr).toMatch(/^Error: Cannot stop before the start/)
    })

    it('rejects an invalid or future time', async () => {
        expect((await ws.run(['start', '--at', '25:00'])).stderr).toBe(
            'Error: "25:00" is neither HH:mm nor an ISO 8601 date\n'
        )
        expect((await ws.run(['start', '--at', day(1, '08:00')])).stderr).toMatch(/is in the future/)
        expect(await ws.exists()).toBe(false)
    })
})

describe('revert', () => {
    beforeEach(async () => {
        await ws.write([`start ${day(-1, '08:00')}`, `stop ${day(-1, '09:00')}`])
    })

    it('deletes the last entry when confirmed', async () => {
        const result = await ws.run(['revert'], {input: 'y\n'})
        expect(result.code).toBe(0)
        expect(result.stdout).toContain(`Delete "stop ${day(-1, '09:00')}"? [y/N] `)
        expect(status(result.stdout.slice(result.stdout.indexOf('date:')))).toMatchObject({
            reverted: `stop ${day(-1, '09:00')}`,
        })
        expect(await ws.read()).toBe(`start ${day(-1, '08:00')}\n`)
    })

    it('keeps the entry when declined or stdin is closed', async () => {
        for (const input of ['n\n', '']) {
            const result = await ws.run(['revert'], {input})
            expect(result.code).toBe(1)
            expect(result.stderr).toBe('Error: Aborted\n')
        }
        expect(await ws.read()).toBe(`start ${day(-1, '08:00')}\nstop ${day(-1, '09:00')}\n`)
    })

    it('does not ask with --yes', async () => {
        const result = await ws.run(['revert', '--yes'])
        expect(result.stdout).not.toContain('[y/N]')
        expect(await ws.read()).toBe(`start ${day(-1, '08:00')}\n`)
    })

    it('fails on an empty log', async () => {
        await ws.write([])
        expect(await ws.run(['revert', '--yes'])).toMatchObject({code: 1, stderr: 'Error: Nothing to revert ...\n'})
    })
})

describe('until', () => {
    it('reports the remaining time', async () => {
        const result = await ws.run(['until', '--goal', '2h', '--since', '1h'])
        expect(result.code).toBe(0)
        expect(status(result.stdout)).toMatchObject({goal: '2 hours', remaining: '2 hours'})
    })

    it('reports zero when the goal is reached', async () => {
        await ws.write([`start ${day(-2, '08:00')}`, `stop ${day(-2, '12:00')}`])
        const result = await ws.run(['until', '--goal', '1h', '--since', '100d'])
        expect(status(result.stdout)).toMatchObject({goal: '1 hour', remaining: 0})
    })

    it('rejects an invalid goal', async () => {
        expect(await ws.run(['until', '--goal', 'banana'])).toMatchObject({
            code: 1,
            stderr: 'Error: "banana" cannot be parsed as duration\n',
        })
    })
})

describe('awake', () => {
    it('prints when this machine woke up or booted', async () => {
        const result = await ws.run(['awake'])
        expect(result.code).toBe(0)
        const date = moment(result.stdout.trim(), moment.ISO_8601, true)
        expect(date.isValid()).toBe(true)
        expect(date.isSameOrBefore(moment())).toBe(true)
    })

    it('can be used to start', async () => {
        const awake = moment((await ws.run(['awake'])).stdout.trim())
        expect((await ws.run(['start', '--at', 'awake'])).code).toBe(0)
        // the boot time is derived from the uptime, so two calls may differ by a second
        const start = moment((await ws.read()).split(' ')[1].trim())
        expect(Math.abs(start.diff(awake, 'seconds'))).toBeLessThanOrEqual(1)
    })
})
