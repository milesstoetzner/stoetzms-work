import * as repository from '../repository'

export type DropOptions = {
    file?: string
}

export default async function (options: DropOptions) {
    await repository.drop(options.file)
}
