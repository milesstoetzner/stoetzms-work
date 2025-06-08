import yaml from 'js-yaml'
import * as repository from './repository'
import * as utils from './utils'
import * as query from './query'
import moment from 'moment'
import {since} from './query'

export type GenericOptions = {
    file: string
}

export type StatusOptions = {} & GenericOptions

export async function status(options: StatusOptions) {
    const entries = await repository.load(options.file)

    const details = {
        date: utils.date(),
        ever: query.ever(entries),
        month: query.month(entries),
        week: query.week(entries),
        '24h': query.yesterday(entries),
        today: query.today(entries),
        current: query.current(entries),
    }

    if (!options.silent) console.log(yaml.dump(details))
}

export type StartOptions = {} & GenericOptions

export async function start(options: StartOptions) {
    const entries = await repository.load(options.file)

    const latest = utils.last(entries)
    if (latest && latest.type === repository.START) throw new Error('Already started ...')

    await status(options)
    await repository.add(options.file, repository.START)
}

export type StopOptions = {strict?: boolean} & GenericOptions

export async function stop(options: StopOptions) {
    options.strict = options.strict ?? false

    const entries = await repository.load(options.file)

    const latest = utils.last(entries)
    if (latest && latest.type === repository.STOP) {
        if (options.strict) throw new Error('Already stopped ...')
        return await status(options)
    }

    await status(options)
    await repository.add(options.file, repository.STOP)
}

export type UntilOptions = {
    goal: string
    since?: string
} & GenericOptions

export async function until(options: UntilOptions) {
    await status(options)

    const entries = await repository.load(options.file)

    const remaining = moment.duration(utils.numerize(options.goal))
    const remainingClone = remaining.clone()

    const limit = options.since
        ? moment().subtract(moment.duration(utils.numerize(options.since)))
        : moment().millisecond(0).second(0).minute(0).hour(0)

    const done = since(entries, limit)

    // TODO: why is the done duration negative?
    remaining.add(done)

    console.log(
        yaml.dump(
            remaining.asMilliseconds() > 0
                ? {
                      goal: utils.humanize(remainingClone),
                      remaining: utils.humanize(remaining),
                      until: moment().add(remaining).format(),
                      since: limit.format(),
                  }
                : {
                      goal: utils.humanize(remainingClone),
                      remaining: 0,
                      since: limit.format(),
                  }
        )
    )
}

export type FocusOptions = {
    goal: string
} & GenericOptions

export async function focus(options: FocusOptions) {
    await start(options)

    process.on('SIGINT', async () => {
        await stop({...options, grace: true})
        process.exit()
    })

    const goalDuration = moment.duration(utils.numerize(options.goal))
    const untilTime = moment().add(goalDuration)

    process.stdout.write(
        yaml.dump({
            goal: utils.humanize(goalDuration),
            until: untilTime.format(),
        })
    )

    let condition = true
    while (condition) {
        const nowTime = moment()
        const remainingDuration = moment.duration(untilTime.diff(nowTime))

        condition = remainingDuration.asMilliseconds() > 0

        if (condition) {
            process.stdout.write(`\rremaining: ${utils.humanize(remainingDuration)}`)
            await utils.sleep()
        }
    }

    process.stdout.write(`\rremaining: 0\n`)
    console.log()

    await stop(options)
    utils.beep()
}

export type EditOptions = {} & GenericOptions

export async function edit(options: EditOptions) {
    repository.edit(options.file)
}

export type DropOptions = {
    dangerous: boolean
} & GenericOptions

export async function drop(options: DropOptions) {
    if (!options.dangerous) throw new Error('Dangerous operation ...')
    await repository.drop(options.file)
}

export type CatOptions = {} & GenericOptions

export async function cat(options: CatOptions) {
    console.log(await repository.raw(options.file))
}

export type DateOptions = {} & GenericOptions

export async function date(options: DateOptions) {
    console.log(utils.date())
}
