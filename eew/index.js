import config from './src/config/config.js'
import axios from 'axios'
import mqttClient from './src/mqttClient.js'
import report from './src/handler/report.js'

report()
mqttClient()
