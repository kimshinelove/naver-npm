#!/usr/bin/env node
;(function () { // wrapper in case we're in module_context mode

  // windows: running "npm blah" in this folder will invoke WSH, not node.
  /*global WScript*/
  if (typeof WScript !== 'undefined') {
    WScript.echo(
      'npm does not work when run\n' +
        'with the Windows Scripting Host\n\n' +
        "'cd' to a different directory,\n" +
        "or type 'npm.cmd <args>',\n" +
        "or type 'node npm <args>'."
    )
    WScript.quit(1)
    return
  }

  process.title = 'npm'

  var log = require('npmlog')
  log.pause() // will be unpaused when config is loaded.

  log.info('it worked if it ends with', 'ok')

  var path = require('path')
  var npm = require('../lib/npm.js')
  var npmconf = require('../lib/config/core.js')
  var errorHandler = require('../lib/utils/error-handler.js')

  var configDefs = npmconf.defs
  var shorthands = configDefs.shorthands
  var types = configDefs.types
  var nopt = require('nopt')

  // if npm is called as "npmg" or "npm_g", then
  // run in global mode.
  if (path.basename(process.argv[1]).slice(-1) === 'g') {
    process.argv.splice(1, 1, 'npm', '-g')
  }

  log.verbose('cli', process.argv)

  var conf = nopt(types, shorthands)

  // 강제로 사내 NPM 서버 바로보도록 수정
  conf.registry = "https://npm.navercorp.com/";

// with SSL UNABLE_TO_VERIFY_LEAF_SIGNATURE 오류 해결 - 추천하는 방법은 아님.
  conf['strict-ssl'] = false;

// force set prefix for windows os
  if(process.platform === 'win32') {

    // 로컬 인스톨일 경우에는 아래 프리픽스 붙이지 않도록 처리
    if(process.env.APPDATA && (process.argv.indexOf('global') > 0 || process.argv.indexOf('-g') > 0)) {
      conf.prefix = process.env.APPDATA + '\\npm';
    }
  }

  npm.argv = conf.argv.remain
  if (npm.deref(npm.argv[0])) npm.command = npm.argv.shift()
  else conf.usage = true

  if (conf.version) {
    console.log(npm.version)
    return
  }

  if (conf.versions) {
    npm.command = 'version'
    conf.usage = false
    npm.argv = []
  }

  log.info('using', 'npm@%s', npm.version)
  log.info('using', 'node@%s', process.version)

  process.on('uncaughtException', errorHandler)

  if (conf.usage && npm.command !== 'help') {
    npm.argv.unshift(npm.command)
    npm.command = 'help'
  }

  // now actually fire up npm and run the command.
  // this is how to use npm programmatically:
  conf._exit = true
  npm.load(conf, function (er) {
    if (er) return errorHandler(er)
    npm.commands[npm.command](npm.argv, errorHandler)
  })
})()
