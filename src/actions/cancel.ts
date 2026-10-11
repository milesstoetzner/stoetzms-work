import * as repository from '../repository'
import * as utils from '../utils'
import * as query from '../query'

export type CancelOptions = {
    file?: string
}

/**
 * Discards the running session and returns the status afterwards.
 */
export default async function (options: CancelOptions) {
    const entries = await repository.load(options.file)

    const latest = utils.last(entries)
    if (!latest || latest.type !== repository.START) throw new Error('Not started ...')

    const cancelled = query.current(entries)
    await repository.cancel(options.file)

    return {...query.status(entries.slice(0, -1)), cancelled}
}
