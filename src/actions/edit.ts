import * as repository from '../repository'

export type EditOptions = {
    file?: string
}

export default async function (options: EditOptions) {
    repository.edit(options.file)
}
