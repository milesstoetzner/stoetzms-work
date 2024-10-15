#!/usr/bin/env node

const {Command} = require('commander')
const actions = require('./actions')
const {hae} = require("./utils");
const config = require('./config')

const program = new Command()

program.name('work').description('A simple utility for tracking working hours.')

program.command('status')
    .description('get status')
    .option('--file [string]', '', config.file)
    .action(hae(async options => {
        await actions.status(options)
    }))

program.command('start')
    .description('start tracking')
    .option('--file [string]', '', config.file)
    .action(hae(async options => {
        await actions.start(options)
    }))

program.command('stop')
    .description('stop tracking')
    .option('--file [string]', '', config.file)
    .action(hae(async options => {
        await actions.stop(options)
    }))

program.command('until')
    .description('until goal reached')
    .option('--file [string]', '', config.file)
    .option('--goal [string]', '')
    .action(hae(async options => {
        await actions.until(options)
    }))

program.command('edit')
    .description('open file in editor')
    .option('--file [string]', '', config.file)
    .action(hae(async options => {
        await actions.edit(options)
    }))

program.command('cat')
    .description('cat file')
    .option('--file [string]', '', config.file)
    .action(hae(async options => {
        await actions.cat(options)
    }))

program.command('drop')
    .description('drop file')
    .option('--file [string]', '', config.file)
    .option('--dangerous', '', false)
    .action(hae(async options => {
        await actions.drop(options)
    }))

program.command('date')
    .description('get date')
    .option('--file [string]', '', config.file)
    .action(hae(async options => {
        await actions.date(options)
    }))

program.parse()