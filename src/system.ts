import {execFile} from 'node:child_process'
import * as os from 'node:os'
import {promisify} from 'node:util'
import moment from 'moment'

const run = promisify(execFile)

// The latest resume from sleep (Power-Troubleshooter) or from Modern Standby (Kernel-Power 507)
const WINDOWS = `
@(
    Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Power-Troubleshooter'; Id=1} -MaxEvents 1 -ErrorAction SilentlyContinue
    Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Kernel-Power'; Id=507} -MaxEvents 1 -ErrorAction SilentlyContinue
) | ForEach-Object { $_.TimeCreated.ToUniversalTime().ToString('o') }
`

/**
 * When this machine was last woken up from sleep or, if it has not slept since, booted.
 */
export async function wake() {
    const booted = boot()
    const woken = await resumed().catch(() => undefined)
    return woken && woken.isAfter(booted) ? woken : booted
}

export function boot() {
    return moment().subtract(Math.round(os.uptime()), 'seconds')
}

async function resumed() {
    if (process.platform === 'darwin') return sysctl((await run('sysctl', ['-n', 'kern.waketime'])).stdout)
    if (process.platform === 'win32') {
        return latest((await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', WINDOWS])).stdout)
    }
    if (process.platform === 'linux') {
        const args = ['-k', '-b', '--no-pager', '-o', 'short-iso', '--grep', 'PM: (suspend|hibernation) exit']
        return latest((await run('journalctl', args)).stdout)
    }
}

/**
 * Parses "{ sec = 1791715862, usec = 213214 } Sun Oct 11 12:51:02 2026" of macOS sysctl. Zero means never.
 */
export function sysctl(output: string) {
    const sec = /sec = (\d+)/.exec(output)?.[1]
    if (!sec || sec === '0') return
    return moment.unix(Number(sec))
}

/**
 * The latest of the ISO 8601 dates that start the given lines.
 */
export function latest(output: string) {
    const dates = output
        .split(/\r?\n/)
        .map(line => moment(line.trim().split(/\s+/)[0], moment.ISO_8601, true))
        .filter(date => date.isValid())
    if (!dates.length) return
    return moment.max(dates)
}
