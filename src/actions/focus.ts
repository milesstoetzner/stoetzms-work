import moment from 'moment/moment'
import * as utils from '../utils'
import yaml from 'js-yaml'
import actions from './index'

export type FocusOptions = {
    file?: string
    goal: string
}

export default async function (options: FocusOptions) {
    await actions.start(options)

    process.on('SIGINT', async () => {
        await actions.stop({...options, grace: true})
        process.exit()
    })

    const goalDuration = moment.duration(utils.numerize(options.goal))
    const untilTime = moment().add(goalDuration)

    process.stdout.write(
        yaml.dump({
            goal: utils.humanize(goalDuration),
            until: untilTime.format(),
        })
    )

    let condition = true
    while (condition) {
        const nowTime = moment()
        const remainingDuration = moment.duration(untilTime.diff(nowTime))

        condition = remainingDuration.asMilliseconds() > 0

        if (condition) {
            process.stdout.write(`\rremaining: ${utils.humanize(remainingDuration)}`)
            await utils.sleep()
        }
    }

    process.stdout.write(`\rremaining: 0\n`)
    console.log()

    await actions.stop(options)
    utils.beep()
}
