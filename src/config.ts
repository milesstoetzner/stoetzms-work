import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import yaml from 'js-yaml'

export const VERSION = `${process.env.STOETZMS_WORK_COMMIT ?? 'LOCAL'} (${process.env.STOETZMS_WORK_VERSION ?? 'LOCAL'})`

export type Config = {
    // the default working hours file
    file?: string
    // the command to open the working hours file with, e.g., "code --wait"
    editor?: string
}

const KEYS: (keyof Config)[] = ['file', 'editor']

export function location() {
    return process.env.STOETZMS_WORK_CONFIG ?? path.join(os.homedir(), '.stoetzms-work.yaml')
}

export function load(): Config {
    const file = location()
    if (!fs.existsSync(file)) return {}

    const data = yaml.load(fs.readFileSync(file).toString()) ?? {}
    if (typeof data !== 'object' || Array.isArray(data)) throw new Error(`${file}: expected a mapping`)

    for (const [key, value] of Object.entries(data)) {
        if (!KEYS.includes(key as keyof Config)) throw new Error(`${file}: unknown key "${key}"`)
        if (typeof value !== 'string') throw new Error(`${file}: "${key}" must be a string`)
    }

    return data as Config
}

/**
 * The editor is taken from the config, then $VISUAL, then $EDITOR, and defaults to VS Code.
 */
export function editor() {
    return load().editor ?? process.env.VISUAL ?? process.env.EDITOR ?? 'code'
}
