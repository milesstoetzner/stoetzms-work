import * as repository from '../repository'
import moment from 'moment'
import * as utils from '../utils'
import * as query from '../query'

export type UntilOptions = {
    file?: string
    goal: string
    since?: string
}

export default async function (options: UntilOptions) {
    const entries = await repository.load(options.file)

    const goal = moment.duration(utils.numerize(options.goal))

    const limit = options.since
        ? moment().subtract(moment.duration(utils.numerize(options.since)))
        : moment().startOf('day')

    const done = query.since(entries, limit)
    const remaining = goal.clone().subtract(done)

    return {
        ...query.status(entries),
        goal: utils.humanize(goal),
        ...(remaining.asMilliseconds() > 0
            ? {remaining: utils.humanize(remaining), until: moment().add(remaining).format()}
            : {remaining: 0}),
        since: limit.format(),
    }
}
