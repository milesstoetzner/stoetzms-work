import * as system from '../system'

export type WakeOptions = Record<string, never>

/**
 * When this machine was last woken up or booted, e.g., for "start --at".
 */
export default async function (options: WakeOptions) {
    return (await system.wake()).format()
}
