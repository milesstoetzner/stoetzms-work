import yaml from 'js-yaml'
import * as repository from './repository'
import * as utils from './utils'
import * as query from './query'

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

    console.log(yaml.dump(details))
}

export type StartOptions = {} & GenericOptions

export async function start(options: StartOptions) {
    const entries = await repository.load(options.file)

    const latest = utils.last(entries)
    if (latest && latest.type === repository.START) throw new Error('Already started ...')

    await status(options)
    await repository.add(options.file, repository.START)
}

export type StopOptions = {} & GenericOptions

export async function stop(options: StopOptions) {
    const entries = await repository.load(options.file)

    const latest = utils.last(entries)
    if (latest && latest.type === repository.STOP) throw new Error('Already stopped ...')

    await status(options)
    await repository.add(options.file, repository.STOP)
}

export type UntilOptions = {
    goal: string
    since: string
} & GenericOptions

export async function until(options: UntilOptions) {
    await status(options)

    const entries = await repository.load(options.file)
    const result = query.until(entries, {goal: options.goal, since: options.since})

    console.log(yaml.dump(result))
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
    return console.log(utils.date())
}
