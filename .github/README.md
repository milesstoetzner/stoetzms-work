# Work

A simple utility for tracking working hours.

## Installation

```shell
npm install -g stoetzms-work
```

## Usage

```
Usage: work [options] [command]

A simple utility for tracking working hours.

Options:
  -h, --help        display help for command

Commands:
  status [options]  get status
  start [options]   start tracking
  stop [options]    stop tracking
  edit [options]    open file in editor
  cat [options]     cat file
  drop [options]    drop file
  date [options]    get date
  help [command]    display help for command
```

## Environment

| Environment Variable        | Description | Default                                 | 
|-----------------------------|-------------|-----------------------------------------| 
| `STOETZMS_WORK_BASE_DIR`    |             | `~/stoetzms/work`                       |
| `STOETZMS_WORK_CONFIG_FILE` |             | `${STOETZMS_WORK_BASE_DIR}/config.yaml` |
| `STOETZMS_WORK_WORK_FILE`   |             | `${STOETZMS_WORK_BASE_DIR}/work.log`    |

## Configuration

```yaml
# ${STOETZMS_WORK_CONFIG_FILE}
file: ${STOETZMS_WORK_WORK_FILE}
```