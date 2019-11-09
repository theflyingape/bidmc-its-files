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
import { MongoClient } from 'mongodb'
import { spawn } from 'child_process'
import { URL } from 'url'

process.title = 'watcher'
//process.chdir(__dirname)

let loglevel = 0 || 'LOG_NOTICE'
if (isNaN(+loglevel)) loglevel = syslog.level[loglevel]

syslog.open(process.title)
syslog.upto(+loglevel)

let db = new MongoClient('mongodb://localhost'
    , { poolSize: 5, reconnectInterval: 500, useUnifiedTopology: true })

db.connect((err, db) => {
    if (err) {
        console.log("Connection Failed Via Client Object.")
    } else {
        console.log("Connected Via Client Object . . .")
    }
})

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


/********
 *
 *  APIs
 *
 ********/
//dns.lookup('0.0.0.0', (err, addr, family) => {
dns.lookup('localhost', (err, addr, family) => {

    const app = express()
    app.set('trust proxy', ['loopback', addr])

    let ssl = { key: fs.readFileSync('keys/localhost.key'), cert: fs.readFileSync('keys/localhost.crt') }
    let server = https.createServer(ssl, app)
    let port = parseInt(process.env.PORT) || 20172

    //  enable REST services
    server.listen(port, addr)

    //  web services
    app.use('/', express.static('static'))

    app.get('/api/', (req, res) => {
        let client = req.header('x-forwarded-for') || req.connection.remoteAddress
        console.log(`API call from remote host: ${client} (${req.hostname})`)

        res.end()
    })
})

/********
 *
 * PROCESS SIGNAL HANDLERS
 *
 ********/

process.on('exit', () => {
    db.logout((err, result) => {
        if (!err) {
            console.log("Logged out Via Client Object . . .")
        }
        db.close()
        console.log("Connection closed . . .")
    })
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
