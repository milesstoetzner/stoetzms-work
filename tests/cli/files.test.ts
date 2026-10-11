import * as fs from 'node:fs/promises'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {day, Workspace} from './helpers'

vi.setConfig({testTimeout: 30_000})

let ws: Workspace

beforeEach(async () => {
    ws = await Workspace.create()
})

describe('marks', () => {
    it('track into a separate file next to the configured one', async () => {
        await ws.run(['start', '--mark', 'acme', '--at', day(-1, '08:00')])
        await ws.run(['stop', '--mark', 'acme', '--at', day(-1, '10:00')])
        expect(await ws.read('work-acme.log')).toBe(`start ${day(-1, '08:00')}\nstop ${day(-1, '10:00')}\n`)
        expect(await ws.exists()).toBe(false)
        expect((await ws.run(['status', '--mark', 'acme', '-o', 'json'])).stdout).toContain('"ever": "2 hours"')
        expect((await ws.run(['status', '-o', 'json'])).stdout).toContain('"ever": "0 seconds"')
    })

    it('reject invalid names and --file', async () => {
        expect((await ws.run(['start', '--mark', '../x'])).stderr).toBe(
            'Error: "../x" is not a valid mark (letters, digits, "_" and "-")\n'
        )
        expect((await ws.run(['start', '--mark', 'acme', '--file', ws.file])).stderr).toBe(
            'Error: Use either --file or --mark\n'
        )
        expect(await fs.readdir(ws.dir)).toEqual(['config.yaml'])
    })
})

describe('--file', () => {
    it('overrides the configured file', async () => {
        await ws.run(['start', '--file', ws.path('other.log'), '--at', day(-1, '08:00')])
        expect(await ws.read('other.log')).toBe(`start ${day(-1, '08:00')}\n`)
        expect(await ws.exists()).toBe(false)
    })
})

describe('config', () => {
    it('rejects unknown keys', async () => {
        await fs.writeFile(ws.config, 'fiel: x\n')
        expect(await ws.run(['status'])).toMatchObject({code: 1, stderr: `Error: ${ws.config}: unknown key "fiel"\n`})
    })
})

describe('validation', () => {
    it('reports the broken line', async () => {
        await ws.write([`start ${day(-1, '08:00')}`, '', `start ${day(-1, '09:00')}`])
        expect((await ws.run(['status'])).stderr).toBe(
            `Error: ${ws.file}:3: expected stop: "start ${day(-1, '09:00')}"\n`
        )
    })
})

describe('cat', () => {
    it('prints the log', async () => {
        await ws.write([`start ${day(-1, '08:00')}`])
        expect((await ws.run(['cat'])).stdout).toBe(`start ${day(-1, '08:00')}\n\n`)
    })
})

describe('edit', () => {
    it('opens the log with $EDITOR', async () => {
        await fs.writeFile(ws.path('editor.sh'), `#!/bin/sh\necho "$@" > ${ws.path('args')}\n`, {mode: 0o755})
        const result = await ws.run(['edit'], {env: {EDITOR: `${ws.path('editor.sh')} --wait`}})
        expect(result.code).toBe(0)
        expect(await ws.read('args')).toBe(`--wait ${ws.file}\n`)
    })

    it('prefers the editor of the config', async () => {
        await fs.writeFile(ws.path('editor.sh'), `#!/bin/sh\necho "$@" > ${ws.path('args')}\n`, {mode: 0o755})
        await fs.appendFile(ws.config, `editor: ${ws.path('editor.sh')}\n`)
        await ws.run(['edit'], {env: {EDITOR: 'false'}})
        expect(await ws.read('args')).toBe(`${ws.file}\n`)
    })

    it('fails if the editor fails', async () => {
        const result = await ws.run(['edit'], {env: {EDITOR: 'false'}})
        expect(result).toMatchObject({code: 1, stderr: 'Error: Editor "false" exited with 1\n'})
    })
})

describe('drop', () => {
    beforeEach(async () => {
        await ws.write([`start ${day(-1, '08:00')}`])
    })

    it('deletes the log when confirmed', async () => {
        const result = await ws.run(['drop'], {input: 'yes\n'})
        expect(result.stdout).toBe(`Delete ${ws.file}? [y/N] `)
        expect(await ws.exists()).toBe(false)
    })

    it('keeps the log when declined', async () => {
        expect(await ws.run(['drop'], {input: 'n\n'})).toMatchObject({code: 1, stderr: 'Error: Aborted\n'})
        expect(await ws.exists()).toBe(true)
    })

    it('does not ask with -y', async () => {
        expect(await ws.run(['drop', '-y'])).toMatchObject({code: 0, stdout: ''})
        expect(await ws.exists()).toBe(false)
    })

    it('does not ask without a log', async () => {
        expect(await ws.run(['drop', '--mark', 'none'])).toMatchObject({code: 0, stdout: ''})
    })
})
