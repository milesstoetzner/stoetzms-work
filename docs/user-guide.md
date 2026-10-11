# User Guide

## Installation

Install the binary on Linux using ...

```shell
curl -fsSL https://work.stoetz.ms/install.sh | sudo bash -
```

Install the binary on Windows using ...

```powershell
powershell -Command "& {Invoke-WebRequest -Uri 'https://work.stoetz.ms/install.ps1' -UseBasicParsing | Invoke-Expression}"
```

## Usage

```
Usage: work [options] [command]

A simple utility for tracking working hours.

Options:
  -V, --version     output the version number
  -h, --help        display help for command

Commands:
  status [options]  get the current working status
  start [options]   start tracking
  stop [options]    stop tracking
  until [options]   until goal reached
  focus [options]   focus
  edit [options]    open the working hours file in an editor
  cat [options]     cat the working hours file
  drop [options]    drop the working hours file
  date [options]    get current date
  help [command]    display help for command
```

## Configuration

The working hours are stored in `~/stoetzms-work.log` unless `--file` is given.
Defaults can be set in `~/.stoetzms-work.yaml` (or the file `STOETZMS_WORK_CONFIG` points to).

```yaml
# the default working hours file
file: ~/work/hours.log

# the command to open the working hours file with
editor: code --wait
```

`work edit` uses the configured `editor`, then `$VISUAL`, then `$EDITOR`, and falls back to VS Code (`code`).
