/*****************************************************************************\
 *  BIDMC ITS Filesystem Watcher                                             *
 *  main.ts authored by: Robert Hurst <rhurst@bidmc.harvard.edu>             *
\*****************************************************************************/
import chokidar = require('chokidar')
import dns = require('dns')
import express = require('express')
import fs = require('fs')
import gs = require('ghostscript4js')
import https = require('https')
import os = require('os')
//import pty = require('node-pty')
import path = require('path')
import serverStatic = require('serve-static')
import syslog = require('modern-syslog')
//import ws = require('ws')
import { spawn } from 'child_process'
const { URL } = require('url')

process.title = 'watcher'
//process.chdir(__dirname)

let loglevel = 0 || 'LOG_NOTICE'
if (isNaN(+loglevel)) loglevel = syslog.level[loglevel]

syslog.open(process.title)
syslog.upto(+loglevel)

let events = 0

const watcher = chokidar.watch('.', {
    ignored: [ '**/.**', '**/node_modules/**', '**/tmp/**' ],
    ignoreInitial: true
})

syslog.note(`started up in ${__dirname}`)

watcher.on('add', (file) => {
    console.log(event, file)
    events++

    if (/.*\.pcl$/i.test(file)) {
        let pdf = path.join(path.dirname(file), path.basename(file, path.extname(file)) + '.pdf')

        spawn('./gpcl6',
            ['-dNOPAUSE', `-sOutputFile=${pdf}`, '-sDEVICE=pdfwrite', `${file}`])
            .on('exit', (code, signal) => {
                syslog.note(`${pdf} exit code ${code} ${signal && 'signal ' + signal || ''}`)
            })

/*
        gs.execute(`-dNOPAUSE -sOutputFile=${pdf} -sDEVICE=pdfwrite ${file}`)
            .then(() => {
                console.log(`converted to ${pdf}`)
            })
            .catch((err) => {
                console.log(err)
            })
*/
        }
    })

watcher.on('ready', () => {
    console.log(`Initial scan complete -- ${Object.keys(watcher.getWatched()).length} dir(s)`)
    console.log(`Watching for any change`)
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
    console.log(new Date() + ' shutdown:', events, 'trapped')
    syslog.note('quit')
    process.exit()
})

process.on('SIGTERM', function () {
    console.log(new Date() + ' shutdown:', events, 'trapped')
    syslog.note('Terminating this service profile')
    process.exit()
})
