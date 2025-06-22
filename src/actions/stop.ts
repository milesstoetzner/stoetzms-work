import * as repository from '../repository'
import * as utils from '../utils'
import actions from './index'

export type StopOptions = {file?: string}

export default async function (options: StopOptions) {
    const entries = await repository.load(options.file)

    const latest = utils.last(entries)
    if (latest && latest.type === repository.STOP) return await actions.status(options)

    await actions.status(options)
    await repository.add(repository.STOP, options.file)
}
