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

    const remaining = moment.duration(utils.numerize(options.goal))
    const remainingClone = remaining.clone()

    const limit = options.since
        ? moment().subtract(moment.duration(utils.numerize(options.since)))
        : moment().millisecond(0).second(0).minute(0).hour(0)

    const done = since(entries, limit)

    // TODO: why is the done duration negative?
    remaining.add(done)

    console.log(
        yaml.dump(
            remaining.asMilliseconds() > 0
                ? {
                      goal: utils.humanize(remainingClone),
                      remaining: utils.humanize(remaining),
                      until: moment().add(remaining).format(),
                      since: limit.format(),
                  }
                : {
                      goal: utils.humanize(remainingClone),
                      remaining: 0,
                      since: limit.format(),
                  }
        )
    )
}
