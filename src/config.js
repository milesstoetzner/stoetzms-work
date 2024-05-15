const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const yaml = require('js-yaml')
const lodash = require('lodash')

const BASE_DIR = process.env.STOETZMS_WORK_BASE_DIR ?? path.join(os.homedir(), '.stoetzms', 'work')
const CONFIG_FILE = process.env.STOETZMS_WORK_CONFIG_FILE ?? path.join(BASE_DIR, 'config.yaml')
const WORK_FILE = process.env.STOETZMS_WORK_WORK_FILE ?? path.join(BASE_DIR, 'work.log')

let config = fs.existsSync(CONFIG_FILE) ? yaml.load(fs.readFileSync(CONFIG_FILE, 'utf8')) : {}
config = lodash.merge({file: WORK_FILE}, config)

module.exports = config
