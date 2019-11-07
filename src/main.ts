/*****************************************************************************\
 *  BIDMC ITS Filesystem Watcher                                             *
 *  main.ts authored by: Robert Hurst <rhurst@bidmc.harvard.edu>             *
\*****************************************************************************/
import chokidar = require('chokidar')
import dns = require('dns')
//import express = require('express')
import fs = require('fs')
import https = require('https')
import os = require('os')
import path = require('path')
//import pty = require('node-pty')
//import serverStatic = require('serve-static')
import syslog = require('modern-syslog')
//import ws = require('ws')
const { URL } = require('url')

process.title = 'watcher'
process.chdir(__dirname)

let loglevel = 0 || 'LOG_NOTICE'
if (isNaN(+loglevel)) loglevel = syslog.level[loglevel]

syslog.open(process.title)
syslog.upto(+loglevel)
syslog.note(`${process.title} started`)

let events = 0

chokidar.watch('.').on('all', (event, path) => {
    console.log(event, path)
    events++
})

process.on('SIGHUP', function () {
    console.log(new Date() + ' :: received hangup')
    syslog.warn('hangup')
})
  
process.on('SIGINT', function () {
    console.log(new Date() + ' :: received interrupt')
    syslog.warn('interrupt')
})
  
process.on('SIGQUIT', function () {
    console.log(new Date() + ' :: received quit')
    syslog.warn('quit')
})
  
process.on('SIGTERM', function () {
    console.log(new Date() + ' shutdown - ', events, 'trapped')
    syslog.note('Terminating this service profile')
    process.exit()
})
