import moment from 'moment'
import {PassThrough} from 'node:stream'
import {describe, expect, it} from 'vitest'
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
