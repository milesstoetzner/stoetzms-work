import * as repository from '../repository'

export type CatOptions = {
    file?: string
}

export default async function (options: CatOptions) {
    return await repository.raw(options.file)
}
