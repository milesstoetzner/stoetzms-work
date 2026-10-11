import * as repository from '../repository'
import * as utils from '../utils'
import * as query from '../query'

export type StopOptions = {file?: string}

/**
 * Stops tracking and returns the status right before, i.e., including the duration of the stopped session.
 */
export default async function (options: StopOptions) {
    const entries = await repository.load(options.file)

    const status = query.status(entries)

    const latest = utils.last(entries)
    if (latest && latest.type === repository.START) await repository.add(repository.STOP, options.file)

    return status
}
