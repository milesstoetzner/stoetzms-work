import {beforeEach, describe, expect, it, vi} from 'vitest'
import {Workspace} from './helpers'

vi.setConfig({testTimeout: 30_000})

let ws: Workspace

beforeEach(async () => {
    ws = await Workspace.create()
})

describe('focus', () => {
    it('tracks until the goal is reached and beeps', async () => {
        const result = await ws.run(['focus', '--goal', '2s'])
        expect(result.code).toBe(0)
        expect(result.stdout).toMatch(/^goal: 2 seconds\nuntil: /)
        expect(result.stdout).toContain('remaining: 0\n')
        expect(result.stdout.endsWith('\x07')).toBe(true)
        expect(await ws.read()).toMatch(/^start \S+\nstop \S+\n$/)
    })

    it('stops on Ctrl-C', async () => {
        const child = ws.spawn(['focus', '--goal', '1h'])
        let stdout = ''
        child.stdout!.on('data', data => (stdout += data))
        await vi.waitFor(() => expect(stdout).toContain('remaining: '), {timeout: 10_000, interval: 50})

        const code = new Promise(resolve => child.on('close', resolve))
        child.kill('SIGINT')
        expect(await code).toBe(0)
        expect(stdout).toContain('remaining: aborted')
        expect(stdout.endsWith('\x07')).toBe(false)
        expect(await ws.read()).toMatch(/^start \S+\nstop \S+\n$/)
    })

    it('does not start with an invalid goal', async () => {
        expect(await ws.run(['focus', '--goal', 'soon'])).toMatchObject({
            code: 1,
            stderr: 'Error: "soon" cannot be parsed as duration\n',
        })
        expect(await ws.exists()).toBe(false)
    })
})
