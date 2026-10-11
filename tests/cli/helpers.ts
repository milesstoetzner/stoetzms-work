import {ChildProcess, spawn} from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import moment from 'moment'

const ROOT = path.resolve(__dirname, '..', '..')

export type Result = {
    code: number | null
    stdout: string
    stderr: string
}

/**
 * The command to run: the bundle given by STOETZMS_WORK_CLI (e.g., "dist/stoetzms-work.js") or else the sources.
 */
function command() {
    const bundle = process.env.STOETZMS_WORK_CLI
    if (bundle) return [path.resolve(ROOT, bundle)]
    return ['--import', 'tsx', path.join(ROOT, 'src', 'index.ts')]
}

/**
 * An isolated directory with its own config whose "file" points into it. Never touches the real home directory.
 */
export class Workspace {
    private constructor(readonly dir: string) {}

    static async create() {
        const workspace = new Workspace(await fs.mkdtemp(path.join(os.tmpdir(), 'stoetzms-work-cli-')))
        await fs.writeFile(workspace.config, `file: ${workspace.file}\n`)
        return workspace
    }

    get file() {
        return path.join(this.dir, 'work.log')
    }

    get config() {
        return path.join(this.dir, 'config.yaml')
    }

    path(name: string) {
        return path.join(this.dir, name)
    }

    async write(lines: string[], name = 'work.log') {
        await fs.writeFile(this.path(name), lines.map(it => it + '\n').join(''))
    }

    async read(name = 'work.log') {
        return (await fs.readFile(this.path(name))).toString()
    }

    async exists(name = 'work.log') {
        return await fs
            .access(this.path(name))
            .then(() => true)
            .catch(() => false)
    }

    env(extra: Record<string, string | undefined> = {}) {
        const env: Record<string, string | undefined> = {
            ...process.env,
            STOETZMS_WORK_CONFIG: this.config,
            TZ: 'Europe/Berlin',
            NODE_NO_WARNINGS: '1',
            DEBUG: undefined,
            EDITOR: undefined,
            VISUAL: undefined,
            ...extra,
        }
        for (const key of Object.keys(env)) if (env[key] === undefined) delete env[key]
        return env as NodeJS.ProcessEnv
    }

    spawn(args: string[], env: Record<string, string | undefined> = {}): ChildProcess {
        return spawn(process.execPath, [...command(), ...args], {cwd: ROOT, env: this.env(env)})
    }

    /**
     * Runs the CLI to completion. Stdin receives the given input and is then closed.
     */
    run(args: string[], options: {input?: string; env?: Record<string, string | undefined>} = {}) {
        return new Promise<Result>((resolve, reject) => {
            const child = this.spawn(args, options.env)
            let stdout = ''
            let stderr = ''
            child.stdout!.on('data', data => (stdout += data))
            child.stderr!.on('data', data => (stderr += data))
            child.on('error', reject)
            child.on('close', code => resolve({code, stdout, stderr}))
            child.stdin!.end(options.input ?? '')
        })
    }
}

/**
 * An ISO 8601 date relative to midnight today, e.g., day(-2, '22:00'), which is always in the past for day < 0.
 */
export function day(offset: number, time: string) {
    const [hours, minutes] = time.split(':').map(Number)
    return moment().startOf('day').add(offset, 'days').hours(hours).minutes(minutes).format()
}
