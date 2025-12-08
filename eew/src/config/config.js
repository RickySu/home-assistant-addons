const config = {
  logConsole: process.env?.LOG_CONSOLE === '1',
  logLevel: process.env?.LOG_LEVEL??'info',
  mqtt: {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  },
  infoUrl: process.env.INFO_URL,
  region: {
    city:  process.env.REGION_CITY,
    district: process.env.REGION_DISTRICT,
  },
  audio: {
    source: process.env.AUDIO_SOURCE,
    target: process.env.AUDIO_TARGET,
  },
  delay: {
    countdown: parseInt(process.env.COUNTDOWN_DELAY),
    play: parseInt(process.env.PLAY_DELAY),
  },
  notify: {
    url: process.env.NOTIFY_MQTT_URL,
    username: process.env.NOTIFY_MQTT_USERNAME,
    password: process.env.NOTIFY_MQTT_PASSWORD,
  }
}

export default config
