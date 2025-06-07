import * as fs from 'node:fs'
import * as os from 'node:os'
import path from 'node:path'
import yaml from 'js-yaml'
import lodash from 'lodash'

const BASE_DIR = process.env.STOETZMS_WORK_BASE_DIR ?? path.join(os.homedir(), '.stoetzms', 'work')
const CONFIG_FILE = process.env.STOETZMS_WORK_CONFIG_FILE ?? path.join(BASE_DIR, 'config.yaml')
const WORK_FILE = process.env.STOETZMS_WORK_WORK_FILE ?? path.join(BASE_DIR, 'work.log')

let config = fs.existsSync(CONFIG_FILE) ? yaml.load(fs.readFileSync(CONFIG_FILE, 'utf8')) : {}
config = lodash.merge({file: WORK_FILE}, config)

export default config as {file: string}
