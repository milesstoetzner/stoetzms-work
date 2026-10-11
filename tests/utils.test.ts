import moment from 'moment'
import {PassThrough} from 'node:stream'
import {afterEach, beforeEach, describe, expect, it, MockInstance, vi} from 'vitest'
import * as utils from '../src/utils'

describe('utils', () => {
    it('last', () => {
        expect(utils.last([])).toBeUndefined()
        expect(utils.last([1, 2, 3])).toBe(3)
    })

    it('empty', () => {
        expect(utils.empty([])).toBe(true)
        expect(utils.empty([1])).toBe(false)
    })

    it('numerize parses durations', () => {
        expect(utils.numerize('6h')).toBe(6 * 60 * 60 * 1000)
        expect(utils.numerize('1h 30m')).toBe(90 * 60 * 1000)
        expect(utils.numerize('1.5h')).toBe(90 * 60 * 1000)
    })

    it('numerize rejects garbage', () => {
        expect(() => utils.numerize('banana')).toThrow('"banana" cannot be parsed as duration')
    })

    it('humanize uses the two largest units', () => {
        expect(utils.humanize(moment.duration(90, 'minutes'))).toBe('1 hour, 30 minutes')
        expect(utils.humanize(moment.duration(3661, 'seconds'))).toBe('1 hour, 1 minute')
        expect(utils.humanize(moment.duration(0))).toBe('0 seconds')
    })

    it('humanize ignores the sign', () => {
        expect(utils.humanize(moment.duration(-2, 'hours'))).toBe('2 hours')
    })

    it('humanize does not roll over to days', () => {
        expect(utils.humanize(moment.duration(30, 'hours'))).toBe('30 hours')
    })
})

describe('confirm', () => {
    async function ask(...lines: string[]) {
        const input = new PassThrough()
        const output = new PassThrough()
        const answer = utils.confirm('Sure? ', input, output)
        for (const line of lines) input.write(line + '\n')
        input.end()
        return await answer
    }

    it('accepts y and yes', async () => {
        expect(await ask('y')).toBe(true)
        expect(await ask('YES')).toBe(true)
        expect(await ask(' yes ')).toBe(true)
    })

    it('rejects everything else', async () => {
        expect(await ask('n')).toBe(false)
        expect(await ask('')).toBe(false)
        expect(await ask('yep')).toBe(false)
    })

    it('rejects closed input', async () => {
        expect(await ask()).toBe(false)
    })
})

describe('time', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-10-11T12:00:00+02:00'))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('defaults to now', () => {
        expect(utils.time().format()).toBe('2026-10-11T12:00:00+02:00')
    })

    it('parses HH:mm as today', () => {
        expect(utils.time('09:15').format()).toBe('2026-10-11T09:15:00+02:00')
        expect(utils.time('9:05').format()).toBe('2026-10-11T09:05:00+02:00')
    })

    it('parses HH:mm in the future as yesterday', () => {
        expect(utils.time('23:50').format()).toBe('2026-10-10T23:50:00+02:00')
    })

    it('parses ISO 8601', () => {
        expect(utils.time('2026-10-10T08:00:00+02:00').format()).toBe('2026-10-10T08:00:00+02:00')
        expect(utils.time('2026-10-10T06:00:00Z').format()).toBe('2026-10-10T08:00:00+02:00')
    })

    it('rejects garbage', () => {
        expect(() => utils.time('25:00')).toThrow('"25:00" is neither HH:mm nor an ISO 8601 date')
        expect(() => utils.time('yesterday')).toThrow('is neither HH:mm nor an ISO 8601 date')
    })

    it('rejects the future', () => {
        expect(() => utils.time('2026-10-12T08:00:00+02:00')).toThrow('is in the future')
    })
})

describe('hae', () => {
    let error: MockInstance<typeof console.error>

    beforeEach(() => {
        error = vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    })

    afterEach(() => {
        vi.restoreAllMocks()
        vi.unstubAllEnvs()
    })

    it('prints only the message to stderr and exits with 1', async () => {
        vi.stubEnv('DEBUG', undefined)
        await utils.hae(async () => {
            throw new Error('Already started ...')
        })({})
        expect(error).toHaveBeenCalledWith('Error: Already started ...')
        expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('prints the stack trace if DEBUG is set', async () => {
        vi.stubEnv('DEBUG', '1')
        const e = new Error('Already started ...')
        await utils.hae(async () => {
            throw e
        })({})
        expect(error).toHaveBeenCalledWith(e)
    })

    it('does nothing on success', async () => {
        await utils.hae(async () => {})({})
        expect(error).not.toHaveBeenCalled()
        expect(process.exit).not.toHaveBeenCalled()
    })
})

describe('csv', () => {
    it('renders a header and rows', () => {
        expect(
            utils.csv([
                {period: '2026-10-10', hours: 2},
                {period: '2026-10-11', hours: 0.5},
            ])
        ).toBe('period,hours\n2026-10-10,2\n2026-10-11,0.5')
    })

    it('quotes cells with commas and quotes', () => {
        expect(utils.csv([{total: '2 hours, 30 minutes', note: 'say "hi"'}])).toBe(
            'total,note\n"2 hours, 30 minutes","say ""hi"""'
        )
    })

    it('is empty without rows', () => {
        expect(utils.csv([])).toBe('')
    })
})

describe('print', () => {
    let log: MockInstance<typeof console.log>

    beforeEach(() => {
        log = vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('prints YAML by default', () => {
        utils.print({today: '1 hour'})
        expect(log).toHaveBeenCalledWith('today: 1 hour\n')
    })

    it('prints JSON', () => {
        utils.print([{period: '2026-10-11', hours: 1}], 'json')
        expect(log).toHaveBeenCalledWith('[\n    {\n        "period": "2026-10-11",\n        "hours": 1\n    }\n]')
    })

    it('prints an array as CSV rows', () => {
        utils.print([{period: '2026-10-11', hours: 1}], 'csv')
        expect(log).toHaveBeenCalledWith('period,hours\n2026-10-11,1')
    })

    it('prints an object as a single CSV row', () => {
        utils.print({today: '1 hour', current: '0 seconds'}, 'csv')
        expect(log).toHaveBeenCalledWith('today,current\n1 hour,0 seconds')
    })

    it('prints strings as is in every format', () => {
        utils.print('2026-10-11T12:00:00+02:00', 'json')
        expect(log).toHaveBeenCalledWith('2026-10-11T12:00:00+02:00')
    })

    it('prints nothing for undefined', () => {
        utils.print(undefined)
        expect(log).not.toHaveBeenCalled()
    })
})
