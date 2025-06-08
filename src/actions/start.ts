import * as repository from '../repository'
import * as utils from '../utils'
import actions from './index'

export type StartOptions = {
    file?: string
}

export default async function (options: StartOptions) {
    const entries = await repository.load(options.file)

    const latest = utils.last(entries)
    if (latest && latest.type === repository.START) throw new Error('Already started ...')

    await actions.status(options)
    await repository.add(repository.START, options.file)
}
