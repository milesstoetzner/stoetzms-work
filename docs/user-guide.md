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

## Quick Start

```shell
work start    # start tracking
work status   # see how much you worked
work stop     # stop tracking
```

Run `work --help` or `work <command> --help` for all options.

## Commands

### status

Shows how much you worked: `today`, since midnight yesterday (`24h`), the last 7 days (`week`), the last 31 days (`month`), in total (`ever`), and in the running session (`current`).

```shell
$ work status
date: '2026-10-11T12:00:00+02:00'
ever: 312 hours, 5 minutes
month: 120 hours, 10 minutes
week: 31 hours, 20 minutes
24h: 9 hours, 15 minutes
today: 3 hours, 30 minutes
current: 1 hour, 5 minutes
```

### start

Starts tracking and shows the status.
Use `--at` if you forgot to start: `HH:mm`, an ISO 8601 date, or `awake` (see [awake](#awake)).

```shell
work start
work start --at 09:15
```

### stop

Stops tracking and shows the status, including how long the session was (`current`).
Use `--at` if you forgot to stop.

```shell
work stop
work stop --at 18:30
```

`HH:mm` means the most recent such time, so `work stop --at 23:50` right after midnight means yesterday at 23:50.
Times in the future, or before the previous entry, are rejected.

### revert

Deletes the last entry, i.e., undoes the last `start` or `stop`, after showing it and asking for confirmation.
Reverting a start discards the running session; reverting a stop lets the session run again.

```shell
$ work revert
Delete "stop 2026-10-11T18:30:00+02:00"? [y/N] y
```

Use `--yes` to skip the question.

### until

Shows how much is left to reach a goal (default: `6h`) today, and when you will reach it.
Use `--since` to count a different duration back from now instead of today.

```shell
work until --goal 8h
work until --goal 40h --since 7d
```

### report

Shows the working hours per day of the last 7 days.
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

### focus

Starts tracking, counts down a goal (default: `6h`), and stops tracking with a beep when the goal is reached.
Press `Ctrl-C` to stop early.

```shell
work focus --goal 25m
```

### awake

Prints when your machine woke up from sleep, or booted if it has not slept since.
Handy if you forgot to start and don't know when: `work start --at awake`.

```shell
$ work awake
2026-10-11T08:42:13+02:00
```

### edit

Opens the working hours file in your editor (see [Configuration](#configuration)).

### cat

Prints the working hours file.

### drop

Deletes the working hours file after asking for confirmation.
Use `--yes` to skip the question.

### date

Prints the current date in the format of the working hours file.

## Output

Commands print YAML by default.
Use `-o json` or `-o csv` (`--output`) for further processing, e.g., `work report -o csv > hours.csv`.

## Marks

To track something separately, e.g., a project, pass a mark to any command.
Each mark has its own working hours file next to the default one, e.g., `~/stoetzms-work-acme.log`.

```shell
work start --mark acme
work status --mark acme
work stop --mark acme
```

A mark consists of letters, digits, `_` and `-`, and cannot be combined with `--file`.

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
