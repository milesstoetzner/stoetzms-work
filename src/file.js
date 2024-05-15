const fs = require('node:fs/promises')
const moment = require('moment')
const exec = require('node:child_process').execSync
const utils = require('./utils')

async function _data(file) {
    const exists = await fs.access(file).then(() => true).catch(() => false)
    if (exists) return (await fs.readFile(file)).toString()
    return ''
}

async function load(file) {
    const data = await _data(file)

    const entries = []
    for (const [index, line] of data.split(/\r?\n/).filter(it => it !== '').entries()) {
        const tmp = line.split(' ')

        if (index % 2 === 0) {
            if (tmp[0] !== utils.START) throw new Error(`Index ${index} not START`)
        }

        if (index % 2 === 1) {
            if (tmp[0] !== utils.STOP) throw new Error(`Index ${index} not STOP`)
        }

        entries.push({
            type: tmp[0], date: moment(tmp[1])
        })
    }

    return entries
}

async function log(file, type) {
    await fs.appendFile(file, type + ' ' + moment().format() + '\n')
}

async function cat(file) {
    return _data(file)
}

function edit(file) {
    exec('code ' + file)
}

module.exports = {log, load, cat, edit}