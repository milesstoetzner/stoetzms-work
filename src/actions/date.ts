import * as utils from '../utils'

export type DateOptions = {
    file?: string
}

export default async function (options: DateOptions) {
    console.log(utils.date())
}
