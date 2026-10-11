import * as system from '../system'

export type AwakeOptions = Record<string, never>

/**
 * When this machine was last woken up or booted, e.g., for "start --at".
 */
export default async function (options: AwakeOptions) {
    return (await system.awake()).format()
}
