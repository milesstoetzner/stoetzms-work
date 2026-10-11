import * as utils from '../utils'

export type DateOptions = Record<string, never>

export default async function (options: DateOptions) {
    console.log(utils.date())
}
