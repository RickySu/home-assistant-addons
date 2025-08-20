import mqtt from 'mqtt'
import log from './log/logger.js'
import bus from './lib/eventBus.js'
import config from './config/config.js'
import axios from "axios";

let mqttClientInstance = null
let brokerInfoCache = null

const clearTimer = (client) => {
  if(client.timer) {
    clearTimeout(client.timer)
    client.timer = null
  }
}
const handleSubscribe = (client) => {
  client.unsubscribe(['warning/cwb', 'report/cwb'])

  client.subscribe('warning/cwb', {
    qos: 1
  })

  client.subscribe('report/cwb', {
    qos: 1
  })

  client.timer = setTimeout(() => {
    clearTimer(client)
    handleSubscribe(client)
  }, 3600000)
}

const handleEvent = (client) => {
  client.on('connect', () => {
    log({ label: 'mqtt', message: `${client.keepConnect?.getTime()} connected` })
    handleSubscribe(client)
  })

  client.on('reconnect', () => {
    log({ label: 'mqtt', message: '${client.keepConnect?.getTime()} reconnect' })
  })

  client.on('error', (err) => {
    log({ label: 'mqtt', message: `${client.keepConnect?.getTime()} error ${JSON.stringify(err)}` })
  })

  client.on('close', (err) => {
    log({ label: 'mqtt', message: `${client.keepConnect?.getTime()} closed ${JSON.stringify(err)}` })
    clearTimer(client)
    if(client.keepConnect === null) {
      return
    }
    setTimeout(() => {
      log({ label: 'mqtt', message: `${client.keepConnect?.getTime()} reconnect` })
      client.reconnect()
    }, 5000)
  })

  client.on('message', (topic, message) => {
    log({ label: 'mqtt', message: `${client.keepConnect?.getTime()} topic ${topic}, Raw ${JSON.stringify(message)}` })
    log({ label: 'mqtt', message: `${client.keepConnect?.getTime()} topic ${topic}, JSON ${message.toString()}` })
    bus.emit(topic, JSON.parse(message.toString()))
  })

  client.on('packetsend', (payload) => {
    log({ label: 'mqtt', message: `${client.keepConnect?.getTime()} packetsend: ${JSON.stringify(payload)}` })
  })

  client.on('packetreceive', (payload) => {
    log({ label: 'mqtt', message: `${client.keepConnect?.getTime()} packetreceive: ${JSON.stringify(payload)}` })
  })
}

const getMqttBroker = async () => {
  try {
    let result = await axios.get(config.infoUrl)
    return brokerInfoCache = result.data.broker
  } catch (error) {
    return brokerInfoCache
  }
}

const mqttDisconnect = async (client) => {
  let oldKeepConnect = client.keepConnect
  client.keepConnect = null
  await client.endAsync()
  log({ label: 'mqtt', message: `${oldKeepConnect.getTime()} end and disconnect` })
}

const mqttConnect = async () => {
  const brokerInfo = await getMqttBroker()
  const url = `mqtts://${brokerInfo.host}:${brokerInfo.port}`
  const params = {
    username: config.mqtt.username,
    keepalive: 30,
    reconnectPeriod: 0,
    password: config.mqtt.password
  }
  const client = mqtt.connect(url, params)
  client.keepConnect = new Date()
  log({ label: 'mqtt', message: `${client.keepConnect?.getTime()} connect to ${url} with ${JSON.stringify(params)}` })
  handleEvent(client)
  return client
}

const connectPooling = async () => {
  let oldClientInstance = mqttClientInstance
  mqttClientInstance = await mqttConnect()
  if(oldClientInstance) {
    await mqttDisconnect(oldClientInstance)
  }
}

const mqttClient = async () => {
  let interval = Math.floor((new Date()).getTime()/1000)
  await connectPooling()
  setInterval(() => {
    let now = Math.floor((new Date()).getTime() / 1000)
    if( now - interval >= 86400) {
      interval = now
      connectPooling()
    }
  }, 5000)
}

export default mqttClient
