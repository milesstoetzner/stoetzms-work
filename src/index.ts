#!/usr/bin/env node

import {Command} from 'commander'
import actions from './actions'
import {hae} from './utils'
import * as config from './config'

const program = new Command()

program.name('work').description('A simple utility for tracking working hours.').version(config.VERSION)

program
    .command('status')
    .description('get the current working status')
    .option('--file [string]', `the working hours file`)
    .action(
        hae(async options => {
            await actions.status(options)
        })
    )

program
    .command('start')
    .description('start tracking')
    .option('--file [string]', `the working hours file`)
    .action(
        hae(async options => {
            await actions.start(options)
        })
    )

program
    .command('stop')
    .description('stop tracking')
    .option('--file [string]', `the working hours file`)
    .option('--strict [boolean]', `abort if already stopped`)
    .action(
        hae(async options => {
            await actions.stop(options)
        })
    )

program
    .command('until')
    .description('until goal reached')
    .option('--file [string]', `the working hours file`)
    .option('--goal [string]', 'the duration to work', '6h')
    .option('--since [string]', 'the duration since when to achieve the goal (default: today)')
    .action(
        hae(async options => {
            await actions.until(options)
        })
    )

program
    .command('focus')
    .description('focus')
    .option('--file [string]', `the working hours file`)
    .option('--goal [string]', 'the duration to work', '6h')
    .action(
        hae(async options => {
            await actions.focus(options)
        })
    )

program
    .command('edit')
    .description('open the working hours file in VS Code')
    .option('--file [string]', `the working hours file`)
    .action(
        hae(async options => {
            await actions.edit(options)
        })
    )

program
    .command('cat')
    .description('cat the working hours file')
    .option('--file [string]', `the working hours file`)
    .action(
        hae(async options => {
            await actions.cat(options)
        })
    )

program
    .command('drop')
    .description('drop the working hours file')
    .option('--file [string]', `the working hours file`)
    .requiredOption('--dangerous', '', false)
    .action(
        hae(async options => {
            await actions.drop(options)
        })
    )

program
    .command('date')
    .description('get current date')
    .option('--file [string]', `the working hours file`)
    .action(
        hae(async options => {
            await actions.date(options)
        })
    )

program.parse()
