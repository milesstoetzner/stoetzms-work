import * as repository from '../repository'
import * as utils from '../utils'
import * as query from '../query'
import * as system from '../system'

export type StartOptions = {
    file?: string
    at?: string
}

/**
 * Starts tracking (now, at the given time, or when this machine woke up) and returns the status right before.
 */
export default async function (options: StartOptions) {
    const at = options.at === 'awake' ? await system.awake() : utils.time(options.at)
    const entries = await repository.load(options.file)

    const latest = utils.last(entries)
    if (latest && latest.type === repository.START) throw new Error('Already started ...')
    if (latest && at.isBefore(latest.date))
        throw new Error(`Cannot start before the last stop at ${latest.date.format()}`)

    const status = query.status(entries, at)
    await repository.add(repository.START, options.file, at)
    return status
}
