import * as repository from '../repository'
import * as query from '../query'

export type ReportOptions = {
    file?: string
    by: string
    last: string
}

export default async function (options: ReportOptions) {
    if (!(options.by in query.PERIODS)) {
        throw new Error(`"${options.by}" is not one of ${Object.keys(query.PERIODS).join(', ')}`)
    }

    const last = Number(options.last)
    if (!Number.isInteger(last) || last < 1) throw new Error(`"${options.last}" is not a positive integer`)

    return query.report(await repository.load(options.file), options.by as query.Period, last)
}
