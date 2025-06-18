#!/usr/bin/with-contenv bashio
# shellcheck shell=bash
set -e

PORT=$(bashio::config 'port')
CACHE_BASE=$(bashio::config 'cache_base')

mkdir -p "$CACHE_BASE"
cd /script
./index.js --port=$PORT --cacheBase="$CACHE_BASE"
