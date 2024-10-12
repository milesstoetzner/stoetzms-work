const yaml = require('js-yaml')
const file = require('./file')
const utils = require('./utils')

async function status(options) {
    const entries = await file.load(options.file ?? config.file)

    const details = {
        'date': utils.date(),
        'ever': utils.ever(entries),
        'month': utils.month(entries),
        'week': utils.week(entries),
        "24h": utils.yesterday(entries),
        'today': utils.today(entries),
        'current': utils.current(entries)
    }

    console.log(yaml.dump(details))
}

async function start(options) {
    const entries = await file.load(options.file)

    const latest = utils.last(entries)
    if (latest && latest.type === utils.START) throw new Error('Already started ...')

    await status(options)
    await file.log(options.file, utils.START)
}

async function stop(options) {
    const entries = await file.load(options.file)

    const latest = utils.last(entries)
    if (latest && latest.type === utils.STOP) throw new Error('Already stopped ...')

    await status(options)
    await file.log(options.file, utils.STOP)
}

async function edit(options) {
    file.edit(options.file)
}

async function drop(options) {
    if (!options.dangerous) throw new Error('Dangerous operation ...')
    await file.drop(options.file)
}

async function cat(options) {
    console.log(await file.cat(options.file))
}

async function date() {
    return console.log(utils.date())
}

module.exports = {start, stop, status, edit, cat, drop, date}