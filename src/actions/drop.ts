import * as repository from '../repository'

export type DropOptions = {
    file?: string
    dangerous: boolean
}

export default async function (options: DropOptions) {
    if (!options.dangerous) throw new Error('Dangerous operation ...')
    await repository.drop(options.file)
}
