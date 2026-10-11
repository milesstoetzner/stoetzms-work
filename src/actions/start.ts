import * as repository from '../repository'
import * as utils from '../utils'
import * as query from '../query'

export type StartOptions = {
    file?: string
}

/**
 * Starts tracking and returns the status right before.
 */
export default async function (options: StartOptions) {
    const entries = await repository.load(options.file)

    const latest = utils.last(entries)
    if (latest && latest.type === repository.START) throw new Error('Already started ...')

    const status = query.status(entries)
    await repository.add(repository.START, options.file)
    return status
}
