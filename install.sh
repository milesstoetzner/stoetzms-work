#!/usr/bin/bash
set -e

if which work &>/dev/null; then
  echo "work is already installed"
  exit 1
fi

if [ "$EUID" -ne 0 ]; then
  echo "script must be executed as root"
  exit 1
fi

if ! which wget &>/dev/null; then
  echo "\"wget\" not installed"
  exit 1
fi

if ! which tar &>/dev/null; then
  echo "\"tar\" not installed"
  exit 1
fi

ARCH=$(uname -m)

if [ "$ARCH" = "x86_64" ]; then
  ARCH=x64
fi

if [ "$ARCH" = "aarch64" ]; then
  ARCH=arm64
fi

if [ ! "$ARCH" = "x64" ] && [ ! "$ARCH" = "arm64" ]; then
  echo "architecture not supported"
  exit 1
fi

PLAT=linux

if [ -f /etc/alpine-release ]; then
  PLAT=alpine
fi

VERSION=${VERSION:-latest}

wget https://github.com/milesstoetzner/stoetzms-work/releases/download/${VERSION}/stoetzms-work-${PLAT}-${ARCH}.xz
tar -xf stoetzms-work-${PLAT}-${ARCH}.xz
rm stoetzms-work-${PLAT}-${ARCH}.xz
mv stoetzms-work-${PLAT}-${ARCH} /usr/bin/work
chmod +x /usr/bin/work
