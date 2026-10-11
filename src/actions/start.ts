import * as repository from '../repository'
import * as utils from '../utils'
import * as query from '../query'

export type StartOptions = {
    file?: string
    at?: string
}

/**
 * Starts tracking (now or at the given time) and returns the status right before.
 */
export default async function (options: StartOptions) {
    const at = utils.time(options.at)
    const entries = await repository.load(options.file)

    const latest = utils.last(entries)
    if (latest && latest.type === repository.START) throw new Error('Already started ...')
    if (latest && at.isBefore(latest.date))
        throw new Error(`Cannot start before the last stop at ${latest.date.format()}`)

    const status = query.status(entries, at)
    await repository.add(repository.START, options.file, at)
    return status
}
