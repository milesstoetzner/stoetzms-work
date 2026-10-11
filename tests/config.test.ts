import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import * as config from '../src/config'
import * as repository from '../src/repository'
import {read, tmpdir, write} from './helpers'

let dir: string
let location: string

beforeEach(async () => {
    dir = await tmpdir()
    location = path.join(dir, 'config.yaml')
    vi.stubEnv('STOETZMS_WORK_CONFIG', location)
    vi.stubEnv('VISUAL', undefined)
    vi.stubEnv('EDITOR', undefined)
})

afterEach(() => {
    vi.unstubAllEnvs()
})

describe('config', () => {
    it('defaults to the home directory', () => {
        vi.stubEnv('STOETZMS_WORK_CONFIG', undefined)
        expect(config.location()).toBe(path.join(os.homedir(), '.stoetzms-work.yaml'))
    })

    it('is empty without a file', () => {
        expect(config.load()).toEqual({})
    })

    it('is empty for an empty file', async () => {
        await fs.writeFile(location, '')
        expect(config.load()).toEqual({})
    })

    it('loads known keys', async () => {
        await write(location, ['file: ~/work.log', 'editor: code --wait'])
        expect(config.load()).toEqual({file: '~/work.log', editor: 'code --wait'})
    })

    it('rejects unknown keys', async () => {
        await write(location, ['fiel: ~/work.log'])
        expect(() => config.load()).toThrow(`${location}: unknown key "fiel"`)
    })

    it('rejects non-string values', async () => {
        await write(location, ['editor: 1'])
        expect(() => config.load()).toThrow(`${location}: "editor" must be a string`)
    })

    it('rejects a non-mapping', async () => {
        await write(location, ['- editor'])
        expect(() => config.load()).toThrow(`${location}: expected a mapping`)
    })
})

describe('file', () => {
    it('is taken from the config', async () => {
        await write(location, ['file: ~/work.log'])
        expect(repository.resolve()).toBe(path.join(os.homedir(), 'work.log'))
    })

    it('is overridden by --file', async () => {
        await write(location, ['file: ~/work.log'])
        expect(repository.resolve('/tmp/other.log')).toBe('/tmp/other.log')
    })
})

describe('editor', () => {
    it('defaults to VS Code', () => {
        expect(config.editor()).toBe('code')
    })

    it('uses $EDITOR', () => {
        vi.stubEnv('EDITOR', 'vim')
        expect(config.editor()).toBe('vim')
    })

    it('prefers $VISUAL over $EDITOR', () => {
        vi.stubEnv('EDITOR', 'vim')
        vi.stubEnv('VISUAL', 'code --wait')
        expect(config.editor()).toBe('code --wait')
    })

    it('prefers the config over the environment', async () => {
        vi.stubEnv('VISUAL', 'code --wait')
        await write(location, ['editor: nano'])
        expect(config.editor()).toBe('nano')
    })
})

describe.skipIf(process.platform === 'win32')('edit', () => {
    async function script(body: string) {
        const file = path.join(dir, 'editor.sh')
        await write(file, ['#!/bin/sh', body])
        await fs.chmod(file, 0o755)
        return file
    }

    it('opens the file with the editor and its arguments', async () => {
        const editor = await script(`echo "$@" > ${dir}/args`)
        vi.stubEnv('EDITOR', `${editor} --wait`)
        repository.edit(path.join(dir, 'work.log'))
        expect(await read(path.join(dir, 'args'))).toBe(`--wait ${path.join(dir, 'work.log')}\n`)
    })

    it('fails if the editor fails', async () => {
        vi.stubEnv('EDITOR', await script('exit 3'))
        expect(() => repository.edit(path.join(dir, 'work.log'))).toThrow('exited with 3')
    })

    it('fails if the editor does not exist', () => {
        vi.stubEnv('EDITOR', path.join(dir, 'missing'))
        expect(() => repository.edit(path.join(dir, 'work.log'))).toThrow('ENOENT')
    })
})
