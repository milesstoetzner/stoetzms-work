import moment from 'moment'
import * as os from 'node:os'
import {describe, expect, it} from 'vitest'
import * as system from '../src/system'

describe('sysctl', () => {
    it('parses kern.waketime', () => {
        const date = system.sysctl('{ sec = 1791715862, usec = 213214 } Sun Oct 11 12:51:02 2026\n')
        expect(date?.format()).toBe('2026-10-11T12:51:02+02:00')
    })

    it('treats zero as never', () => {
        expect(system.sysctl('{ sec = 0, usec = 0 } Thu Jan  1 01:00:00 1970')).toBeUndefined()
    })

    it('ignores garbage', () => {
        expect(system.sysctl('')).toBeUndefined()
    })
})

describe('latest', () => {
    it('takes the latest date of journalctl lines', () => {
        const output = [
            '2026-10-10T22:10:00+0200 laptop kernel: PM: suspend exit',
            '2026-10-11T12:51:02+0200 laptop kernel: PM: suspend exit',
            '2026-10-11T07:00:00+0200 laptop kernel: PM: hibernation exit',
        ].join('\n')
        expect(system.latest(output)?.format()).toBe('2026-10-11T12:51:02+02:00')
    })

    it('takes the latest date of Windows round-trip dates', () => {
        const output = '2026-10-11T10:51:02.1234567Z\r\n2026-10-09T06:00:00.0000000Z\r\n'
        expect(system.latest(output)?.format()).toBe('2026-10-11T12:51:02+02:00')
    })

    it('ignores lines without a date', () => {
        expect(system.latest('-- No entries --\n')).toBeUndefined()
        expect(system.latest('')).toBeUndefined()
    })
})

describe('awake', () => {
    it('is the boot time computed from the uptime', () => {
        const expected = Date.now() - os.uptime() * 1000
        expect(Math.abs(system.boot().valueOf() - expected)).toBeLessThan(2000)
    })

    it('is between boot and now on this machine', async () => {
        const awake = await system.awake()
        expect(awake.isSameOrAfter(system.boot().subtract(2, 'seconds'))).toBe(true)
        expect(awake.isSameOrBefore(moment())).toBe(true)
    })
})
