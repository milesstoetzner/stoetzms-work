import * as repository from '../repository'
import * as utils from '../utils'
import * as query from '../query'

export type RevertOptions = {
    file?: string
    yes?: boolean
}

/**
 * Deletes the last entry, i.e., undoes the last start or stop, after asking for confirmation unless yes is set.
 * Returns the status afterwards.
 */
export default async function (options: RevertOptions) {
    const entries = await repository.load(options.file)
    const line = await repository.latest(options.file)
    if (!entries.length || line === undefined) throw new Error('Nothing to revert ...')

    if (!options.yes && !(await utils.confirm(`Delete "${line}"? [y/N] `))) throw new Error('Aborted')
    await repository.pop(options.file)

    return {...query.status(entries.slice(0, -1)), reverted: line}
}
