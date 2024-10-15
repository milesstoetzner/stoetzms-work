const moment = require("moment/moment");
const humanizeDuration = require("humanize-duration");
const parseDuration = require("parse-duration");

const START = 'start'
const STOP = 'stop'

function hae(action) {
    return async (options) => {
        try {
            await action(options)
        } catch (e) {
            console.log(e)
            process.exit(1)
        }
    }
}

function last(list) {
    if (!list.length) return
    return list[list.length - 1]
}

function empty(list) {
    return list.length === 0
}

function current(entries) {
    const duration = moment.duration()

    if (!empty(entries)) {
        const latest = last(entries)
        if (latest.type === START) {
            duration.add(latest.date.diff(moment()))
        }
    }

    return humanize(duration)
}


function today(entries) {
    return humanize(since(entries, moment()
        .millisecond(0)
        .second(0)
        .minute(0)
        .hour(0)))
}

function until(entries, goal) {
    const remaining = moment.duration(parseDuration(goal))
    const cloned = remaining.clone()

    const done = since(entries, moment()
        .millisecond(0)
        .second(0)
        .minute(0)
        .hour(0))

    // TODO: why is the done duration negative?
    remaining.add(done)

    if (remaining.asMilliseconds() > 0) {
        const date = moment()
        date.add(remaining)
        return {
            goal: humanize(cloned),
            remaining: humanize(remaining),
            until: date.format()
        }
    }
}

function yesterday(entries) {
    return humanize(since(entries, moment()
        .millisecond(0)
        .second(0)
        .minute(0)
        .hour(0)
        .subtract(24, 'hours')))
}


function ever(entries) {
    const duration = moment.duration()

    if (!empty(entries)) {
        for (let index = 0; index + 1 < entries.length; index += 2) {
            const start = entries[index]
            const stop = entries[index + 1]
            duration.add(start.date.diff(stop.date))
        }

        const latest = last(entries)
        if (latest.type === START) {
            duration.add(latest.date.diff(moment()))
        }
    }

    return humanize(duration)
}

function week(entries) {
    return humanize(since(entries, moment()
        .millisecond(0)
        .second(0)
        .minute(0)
        .hour(0)
        .subtract(6, 'days')))
}


function month(entries) {
    return humanize(since(entries, moment()
        .millisecond(0)
        .second(0)
        .minute(0)
        .hour(0)
        .subtract(30, 'days')))
}


function since(entries, limit) {
    const duration = moment.duration()

    // Traverse entries in reverse order
    for (let index = entries.length - 1; index >= 0; index--) {
        const start = entries[index]
        let stop = entries[index + 1]
        if (start.type === STOP) continue

        // Find session before or at limit
        if (start.date.isBefore(limit)) {
            if (!stop) {
                // If working across midnight
                stop = {
                    type: STOP,
                    date: moment()
                }
            }

            if (stop.date.isBefore(limit)) break
            duration.add(stop.date
                .clone()
                .millisecond(0)
                .second(0)
                .minute(0)
                .hour(0)
                .diff(stop.date))
            break
        }

        // Every session within limit
        if (start.date.isAfter(limit)) {
            if (index === entries.length - 1) {
                // If still running
                duration.add(start.date.diff(moment()))
            } else {
                duration.add(start.date.diff(stop.date))
            }
        }
    }

    return duration
}

function date() {
    return moment().format()
}

function humanize(duration) {
    return humanizeDuration(duration.asMilliseconds(), {units: ["h", "m", "s"], round: true, largest: 2})
}

module.exports = {hae, current, week, month, today, ever, last, date, empty, yesterday, START, STOP, until}