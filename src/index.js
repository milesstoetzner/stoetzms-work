#!/usr/bin/env node

const {Command} = require('commander')
const actions = require('./actions')
const {hae} = require("./utils");
const config = require('./config')

const program = new Command()

program.name('work').description('A simple utility for tracking working hours.')

program.command('status')
    .description('get the current working status')
    .option('--file [string]', `the working hours file`, config.file)
    .action(hae(async options => {
        await actions.status(options)
    }))

program.command('start')
    .description('start tracking')
    .option('--file [string]', `the working hours file`, config.file)
    .action(hae(async options => {
        await actions.start(options)
    }))

program.command('stop')
    .description('stop tracking')
    .option('--file [string]', `the working hours file`, config.file)
    .action(hae(async options => {
        await actions.stop(options)
    }))

program.command('until')
    .description('until goal reached')
    .option('--file [string]', `the working hours file`, config.file)
    .option('--goal [string]', 'the duration to work', '6h')
    .action(hae(async options => {
        await actions.until(options)
    }))

program.command('edit')
    .description('open the working hours file in VS Code')
    .option('--file [string]', `the working hours file`, config.file)
    .action(hae(async options => {
        await actions.edit(options)
    }))

program.command('cat')
    .description('cat the working hours file')
    .option('--file [string]', `the working hours file`, config.file)
    .action(hae(async options => {
        await actions.cat(options)
    }))

program.command('drop')
    .description('drop the working hours file')
    .option('--file [string]', `the working hours file`, config.file)
    .option('--dangerous', '', false)
    .action(hae(async options => {
        await actions.drop(options)
    }))

program.command('date')
    .description('get current date')
    .option('--file [string]', `the working hours file`, config.file)
    .action(hae(async options => {
        await actions.date(options)
    }))

program.parse()