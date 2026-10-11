import * as repository from '../repository'
import moment from 'moment/moment'
import * as utils from '../utils'
import {since} from '../query'
import yaml from 'js-yaml'
import actions from './index'

export type UntilOptions = {
    file?: string
    goal: string
    since?: string
}

export default async function (options: UntilOptions) {
    await actions.status(options)

    const entries = await repository.load(options.file)

    const goal = moment.duration(utils.numerize(options.goal))

    const limit = options.since
        ? moment().subtract(moment.duration(utils.numerize(options.since)))
        : moment().startOf('day')

    const done = since(entries, limit)
    const remaining = goal.clone().subtract(done)

    console.log(
        yaml.dump(
            remaining.asMilliseconds() > 0
                ? {
                      goal: utils.humanize(goal),
                      remaining: utils.humanize(remaining),
                      until: moment().add(remaining).format(),
                      since: limit.format(),
                  }
                : {
                      goal: utils.humanize(goal),
                      remaining: 0,
                      since: limit.format(),
                  }
        )
    )
}
