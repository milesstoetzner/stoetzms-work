import moment from 'moment'
import * as utils from '../utils'
import start from './start'
import stop from './stop'

export type FocusOptions = {
    file?: string
    goal: string
}

export type FocusEvents = {
    signal?: AbortSignal
    onStart?: (data: {goal: string; until: string}) => void
    onTick?: (remaining: moment.Duration) => void
}

/**
 * Tracks until the goal is reached or the signal is aborted and returns the status right before stopping.
 */
export default async function (options: FocusOptions, events: FocusEvents = {}) {
    const goal = moment.duration(utils.numerize(options.goal))

    await start(options)

    const until = moment().add(goal)
    events.onStart?.({goal: utils.humanize(goal), until: until.format()})

    while (!events.signal?.aborted) {
        const remaining = moment.duration(until.diff(moment()))
        if (remaining.asMilliseconds() <= 0) break

        events.onTick?.(remaining)
        await utils.sleep(1000, events.signal)
    }

    return await stop(options)
}
