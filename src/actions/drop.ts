import * as repository from '../repository'
import * as utils from '../utils'

export type DropOptions = {
    file?: string
    yes?: boolean
}

/**
 * Deletes the working hours file after asking for confirmation, unless yes is set.
 */
export default async function (options: DropOptions) {
    const file = repository.resolve(options.file)
    if (!(await repository.exists(file))) return
    if (!options.yes && !(await utils.confirm(`Delete ${file}? [y/N] `))) throw new Error('Aborted')
    await repository.drop(file)
}
