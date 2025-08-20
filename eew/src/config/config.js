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
  }
}

export default config
