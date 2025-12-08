#!/usr/bin/with-contenv bashio
# shellcheck shell=bash
set -e

export MQTT_USERNAME=$(bashio::config 'mqtt_user')
export MQTT_PASSWORD=$(bashio::config 'mqtt_password')
export INFO_URL=$(bashio::config 'info_url')
export REGION_CITY=$(bashio::config 'region_city')
export REGION_DISTRICT=$(bashio::config 'region_district')
export COUNTDOWN_DELAY=$(bashio::config 'countdown_delay')
export PLAY_DELAY=$(bashio::config 'play_delay')
export AUDIO_SOURCE=$(bashio::config 'audio_source')
export AUDIO_TARGET=$(bashio::config 'audio_target')

cd /script
node ./index.js
