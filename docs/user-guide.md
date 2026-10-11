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
  -V, --version          output the version number
  -o, --output <format>  the output format (choices: "yaml", "json", "csv",
                         default: "yaml")
  -h, --help             display help for command

Commands:
  status [options]       get the current working status
  start [options]        start tracking
  stop [options]         stop tracking
  revert [options]       delete the last entry, i.e., undo the last start or
                         stop
  until [options]        until goal reached
  report [options]       report the working hours per period
  focus [options]        focus
  edit [options]         open the working hours file in an editor
  cat [options]          cat the working hours file
  drop [options]         drop the working hours file
  date                   get current date
  help [command]         display help for command
```

## Reports

`work report` shows the working hours per day of the last 7 days.
Use `--by week` or `--by month` for other periods and `--last <n>` for more or fewer periods.

```shell
$ work report --by week --last 2
- period: 2026-W40
  hours: 28.08
  total: 28 hours, 5 minutes
- period: 2026-W41
  hours: 6.5
  total: 6 hours, 30 minutes
```

## Output

Commands print YAML by default.
Use `-o json` or `-o csv` (`--output`) for further processing, e.g., `work report -o csv > hours.csv`.

## Correcting Times

Forgot to start or stop? Pass the time it actually happened.

```shell
work start --at 09:15
work stop --at 2026-10-11T18:30:00+02:00
```

`HH:mm` means the most recent such time, so `work stop --at 23:50` right after midnight means yesterday at 23:50.
Times in the future, or before the previous entry, are rejected.

Started or stopped by accident? `work revert` deletes the last entry after showing it and asking for confirmation (`--yes` skips the question).
Reverting a start discards the running session; reverting a stop lets the session run again.

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
