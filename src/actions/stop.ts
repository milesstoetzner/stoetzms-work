import * as repository from '../repository'
import * as utils from '../utils'
import actions from './index'

export type StopOptions = {file?: string; strict?: boolean}

export default async function (options: StopOptions) {
    options.strict = options.strict ?? false

    const entries = await repository.load(options.file)

    const latest = utils.last(entries)
    if (latest && latest.type === repository.STOP) {
        if (options.strict) throw new Error('Already stopped ...')
        return await actions.status(options)
    }

    await actions.status(options)
    await repository.add(repository.STOP, options.file)
}
