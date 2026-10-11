import yaml from 'js-yaml'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {day, Workspace} from './helpers'

vi.setConfig({testTimeout: 30_000})

const COMMANDS = [
    'status',
    'start',
    'stop',
    'revert',
    'until',
    'report',
    'focus',
    'edit',
    'cat',
    'drop',
    'date',
    'awake',
]

let ws: Workspace

beforeEach(async () => {
    ws = await Workspace.create()
})

describe('help and version', () => {
    it('prints the version', async () => {
        const result = await ws.run(['--version'])
        expect(result.code).toBe(0)
        expect(result.stdout).toMatch(/^\S+ \(\S+\)\n$/)
    })

    it('lists every command', async () => {
        const result = await ws.run(['--help'])
        expect(result.code).toBe(0)
        for (const command of COMMANDS) expect(result.stdout).toMatch(new RegExp(`^  ${command}\\b`, 'm'))
    })

    it('prints the help to stderr without a command', async () => {
        const result = await ws.run([])
        expect(result.code).toBe(1)
        expect(result.stdout).toBe('')
        expect(result.stderr).toContain('Usage: work')
    })

    it('rejects an unknown command', async () => {
        const result = await ws.run(['wake'])
        expect(result.code).toBe(1)
        expect(result.stderr).toContain("unknown command 'wake'")
    })
})

describe('output', () => {
    beforeEach(async () => {
        await ws.write([`start ${day(-2, '08:00')}`, `stop ${day(-2, '09:30')}`])
    })

    it('is YAML by default', async () => {
        expect(yaml.load((await ws.run(['status'])).stdout)).toMatchObject({ever: '1 hour, 30 minutes'})
    })

    it('is JSON with -o json, before or after the command', async () => {
        for (const args of [
            ['-o', 'json', 'status'],
            ['status', '--output', 'json'],
        ]) {
            expect(JSON.parse((await ws.run(args)).stdout)).toMatchObject({ever: '1 hour, 30 minutes'})
        }
    })

    it('is CSV with -o csv', async () => {
        const [header, row, ...rest] = (await ws.run(['status', '-o', 'csv'])).stdout.trim().split('\n')
        expect(header).toBe('date,ever,month,week,24h,today,current')
        expect(row).toContain('"1 hour, 30 minutes"')
        expect(rest).toEqual([])
    })

    it('rejects an unknown format before doing anything', async () => {
        const result = await ws.run(['start', '-o', 'xml'])
        expect(result.code).toBe(1)
        expect(result.stderr).toContain("argument 'xml' is invalid")
        expect(await ws.read()).toBe(`start ${day(-2, '08:00')}\nstop ${day(-2, '09:30')}\n`)
    })

    it('prints strings as is', async () => {
        const result = await ws.run(['date', '-o', 'json'])
        expect(result.stdout).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}\n$/)
    })
})

describe('report', () => {
    beforeEach(async () => {
        await ws.write([
            `start ${day(-3, '22:00')}`,
            `stop ${day(-2, '01:00')}`,
            `start ${day(-2, '08:00')}`,
            `stop ${day(-2, '08:30')}`,
        ])
    })

    it('splits sessions at midnight', async () => {
        const rows = JSON.parse((await ws.run(['report', '--last', '5', '-o', 'json'])).stdout)
        expect(rows).toHaveLength(5)
        const period = (offset: number) => day(offset, '00:00').slice(0, 10)
        expect(rows.find((row: any) => row.period === period(-3))).toEqual({
            period: period(-3),
            hours: 2,
            total: '2 hours',
        })
        expect(rows.find((row: any) => row.period === period(-2))).toEqual({
            period: period(-2),
            hours: 1.5,
            total: '1 hour, 30 minutes',
        })
        expect(rows.at(-1)).toMatchObject({period: period(0), hours: 0})
    })

    it('exports CSV', async () => {
        const lines = (await ws.run(['report', '--last', '2', '-o', 'csv'])).stdout.trim().split('\n')
        expect(lines[0]).toBe('period,hours,total')
        expect(lines).toHaveLength(3)
    })

    it('rejects invalid options', async () => {
        expect((await ws.run(['report', '--by', 'year'])).stderr).toBe('Error: "year" is not one of day, week, month\n')
        expect((await ws.run(['report', '--last', '0'])).stderr).toBe('Error: "0" is not a positive integer\n')
    })
})

describe('errors', () => {
    it('go to stderr only, so redirected output stays clean', async () => {
        await ws.write(['stop 2026-01-01T08:00:00+01:00'])
        const result = await ws.run(['report', '-o', 'csv'])
        expect(result).toEqual({
            code: 1,
            stdout: '',
            stderr: `Error: ${ws.file}:1: expected start: "stop 2026-01-01T08:00:00+01:00"\n`,
        })
    })

    it('include the stack trace with DEBUG', async () => {
        await ws.write(['stop 2026-01-01T08:00:00+01:00'])
        const result = await ws.run(['status'], {env: {DEBUG: '1'}})
        expect(result.code).toBe(1)
        expect(result.stderr).toMatch(/expected start[\s\S]*\n\s+at /)
    })
})
