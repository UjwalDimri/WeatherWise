#!/usr/bin/env bash
# Run once after cloning:  ./install-hooks.sh
set -e
chmod +x .githooks/*
git config core.hooksPath .githooks
echo "✔ Git hooks installed (core.hooksPath = .githooks)"
