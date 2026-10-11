import * as repository from '../repository'
import * as utils from '../utils'
import * as query from '../query'

export type StopOptions = {
    file?: string
    at?: string
}

/**
 * Stops tracking (now or at the given time) and returns the status right before, i.e., including the duration of the
 * stopped session.
 */
export default async function (options: StopOptions) {
    const at = utils.time(options.at)
    const entries = await repository.load(options.file)

    const latest = utils.last(entries)
    if (!latest || latest.type === repository.STOP) return query.status(entries)
    if (at.isBefore(latest.date)) throw new Error(`Cannot stop before the start at ${latest.date.format()}`)

    const status = query.status(entries, at)
    await repository.add(repository.STOP, options.file, at)
    return status
}
