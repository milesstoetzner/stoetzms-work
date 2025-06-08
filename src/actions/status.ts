import * as repository from '../repository'
import * as utils from '../utils'
import * as query from '../query'
import yaml from 'js-yaml'

export type StatusOptions = {
    file?: string
}

export default async function (options: StatusOptions) {
    const entries = await repository.load(options.file)

    const details = {
        date: utils.date(),
        ever: query.ever(entries),
        month: query.month(entries),
        week: query.week(entries),
        '24h': query.yesterday(entries),
        today: query.today(entries),
        current: query.current(entries),
    }

    console.log(yaml.dump(details))
}
