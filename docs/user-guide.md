# User Guide

## Installation

Install the binary on Linux using ...

```shell
curl -fsSL https://vintner.opentosca.org/install.sh | sudo bash -
```

Install the binary on Windows using ...

```powershell
powershell -Command "& {Invoke-WebRequest -Uri 'https://vintner.opentosca.org/install.ps1' -UseBasicParsing | Invoke-Expression}"
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
  edit [options]    open the working hours file in VS Code
  cat [options]     cat the working hours file
  drop [options]    drop the working hours file
  date [options]    get current date
  help [command]    display help for command
```
