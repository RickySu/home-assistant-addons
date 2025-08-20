import path from 'path'
import { createLogger, transports, format } from 'winston'
import fs from 'fs'
import { fileURLToPath } from 'url'
import config from '../config/config.js'

const basePath = () => {
  let __dirname = path.dirname(fileURLToPath(import.meta.url))
  return path.join(__dirname, '..', '..')
}

const { combine, timestamp, printf } = format

const logFormat = printf(({ message, label, timestamp, level }) => {
  const now = new Date(timestamp).toLocaleDateString('ja', {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false, minute:'2-digit', second:'2-digit'})
  if(level === 'error'){
    return `[${now}] [${label}] [error] ${JSON.stringify(message)}`
  }
  return `[${now}] [${label}] ${message}`
})

let logger = null
let loggerDate = null

const loggerPath = () => {
  const loggerBasePath = path.join(basePath(), 'log')
  const y = new Date().toLocaleDateString('en', { year: 'numeric' })
  const m = new Date().toLocaleDateString('en', { month: '2-digit' })
  return loggerBasePath
}

const loggerFilePath = (prefix = 'info') => {
  const y = new Date().toLocaleDateString('en', { year: 'numeric' })
  const m = new Date().toLocaleDateString('en', { month: '2-digit' })
  const d = new Date().toLocaleDateString('en', { day: '2-digit' })
  return path.join(loggerPath(), `${prefix}-${y}${m}${d}.log`)
}

const init = () => {
  let transport = null, exceptionTransport = null;
  fs.mkdirSync(loggerPath(), {
    recursive: true
  })

  if(config.logConsole) {
    transport = new transports.Console({
      level: config.logLevel,
      format: combine(timestamp(), logFormat)
    })
    exceptionTransport = new transports.Console()
  }
  else {
    transport = new transports.File({
      filename: loggerFilePath('info'),
      level: config.logLevel,
      format: combine(timestamp(), logFormat)
    })
    exceptionTransport = new transports.File({
      filename: path.join(loggerPath(), 'error.log')
    })
  }
  return createLogger({
    transports: [transport],
    exceptionHandlers: [exceptionTransport]
  })
}

export default (params) => {
  let today = new Date().toLocaleDateString('en', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  if (logger === null || today !== loggerDate) {
    logger = init()
    loggerDate = today
  }

  if(params.level === undefined) {
    params.level = 'info'
  }
  return logger.log(params)
}
