#!/usr/bin/env node

import {Command, Option} from 'commander'
import actions from './actions'
import * as utils from './utils'
import {hae} from './utils'
import * as version from './version'
import * as repository from './repository'

const program = new Command()

program.name('work').description('A simple utility for tracking working hours.').version(version.VERSION)

program.addOption(new Option('-o, --output <format>', 'the output format').choices(utils.OUTPUTS).default('yaml'))

function print(data: unknown) {
    utils.print(data, program.opts().output)
}

// Translates --mark into --file before any action runs
program.hook(
    'preAction',
    hae(async (_: Command, command: Command) => {
        const options = command.opts()
        if (options.mark !== undefined) command.setOptionValue('file', repository.locate(options.file, options.mark))
    })
)

program
    .command('status')
    .description('get the current working status')
    .option('--file [string]', `the working hours file`)
    .option('--mark <name>', 'use the working hours file of this mark, e.g., a project')
    .action(
        hae(async options => {
            print(await actions.status(options))
        })
    )

program
    .command('start')
    .description('start tracking')
    .option('--file [string]', `the working hours file`)
    .option('--mark <name>', 'use the working hours file of this mark, e.g., a project')
    .option('--at [string]', 'start at "HH:mm", an ISO 8601 date or "wake" (see "work wake") instead of now')
    .action(
        hae(async options => {
            print(await actions.start(options))
        })
    )

program
    .command('stop')
    .description('stop tracking')
    .option('--file [string]', `the working hours file`)
    .option('--mark <name>', 'use the working hours file of this mark, e.g., a project')
    .option('--at [string]', 'stop at "HH:mm" or an ISO 8601 date instead of now')
    .action(
        hae(async options => {
            print(await actions.stop(options))
        })
    )

program
    .command('revert')
    .description('delete the last entry, i.e., undo the last start or stop')
    .option('--file [string]', `the working hours file`)
    .option('--mark <name>', 'use the working hours file of this mark, e.g., a project')
    .option('-y, --yes', 'do not ask for confirmation', false)
    .action(
        hae(async options => {
            print(await actions.revert(options))
        })
    )

program
    .command('until')
    .description('until goal reached')
    .option('--file [string]', `the working hours file`)
    .option('--mark <name>', 'use the working hours file of this mark, e.g., a project')
    .option('--goal [string]', 'the duration to work', '6h')
    .option('--since [string]', 'the duration since when to achieve the goal (default: today)')
    .action(
        hae(async options => {
            print(await actions.until(options))
        })
    )

program
    .command('report')
    .description('report the working hours per period')
    .option('--file [string]', `the working hours file`)
    .option('--mark <name>', 'use the working hours file of this mark, e.g., a project')
    .option('--by [string]', 'the period (day, week, month)', 'day')
    .option('--last [number]', 'the number of periods', '7')
    .action(
        hae(async options => {
            print(await actions.report(options))
        })
    )

program
    .command('focus')
    .description('focus')
    .option('--file [string]', `the working hours file`)
    .option('--mark <name>', 'use the working hours file of this mark, e.g., a project')
    .option('--goal [string]', 'the duration to work', '6h')
    .action(
        hae(async options => {
            const controller = new AbortController()
            process.on('SIGINT', () => controller.abort())

            const status = await actions.focus(options, {
                signal: controller.signal,
                onStart: data => print(data),
                onTick: remaining => process.stdout.write(`\r\x1b[Kremaining: ${utils.humanize(remaining)}`),
            })

            process.stdout.write(`\r\x1b[Kremaining: ${controller.signal.aborted ? 'aborted' : 0}\n\n`)
            print(status)
            if (!controller.signal.aborted) utils.beep()
        })
    )

program
    .command('edit')
    .description('open the working hours file in an editor')
    .option('--file [string]', `the working hours file`)
    .option('--mark <name>', 'use the working hours file of this mark, e.g., a project')
    .action(
        hae(async options => {
            await actions.edit(options)
        })
    )

program
    .command('cat')
    .description('cat the working hours file')
    .option('--file [string]', `the working hours file`)
    .option('--mark <name>', 'use the working hours file of this mark, e.g., a project')
    .action(
        hae(async options => {
            print(await actions.cat(options))
        })
    )

program
    .command('drop')
    .description('drop the working hours file')
    .option('--file [string]', `the working hours file`)
    .option('--mark <name>', 'use the working hours file of this mark, e.g., a project')
    .option('-y, --yes', 'do not ask for confirmation', false)
    .action(
        hae(async options => {
            await actions.drop(options)
        })
    )

program
    .command('date')
    .description('get current date')
    .action(
        hae(async options => {
            print(await actions.date(options))
        })
    )

program
    .command('wake')
    .description('get when this machine was woken up or booted, e.g., for "start --at"')
    .action(
        hae(async options => {
            print(await actions.wake(options))
        })
    )

program.parseAsync()
