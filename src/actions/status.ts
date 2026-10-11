import * as repository from '../repository'
import * as query from '../query'

export type StatusOptions = {
    file?: string
}

export default async function (options: StatusOptions) {
    return query.status(await repository.load(options.file))
}
