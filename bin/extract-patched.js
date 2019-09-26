module.exports = Extract

const Parse = require('unzipper').Parse
const Writer = require('fstream').Writer
const path = require('path')
const fs = require('fs')
const stream = require('stream')
const duplexer2 = require('duplexer2')
const Promise = require('bluebird')

function Extract(opts) {
  // make sure path is normalized before using it
  opts.path = path.normalize(opts.path)
  const parser = new Parse(opts)

  const outStream = new stream.Writable({ objectMode: true })
  outStream._write = function(entry, encoding, cb) {
    if (entry.path.includes('__MACOSX')) {
      return cb()
    }

    extract.emit('entry', entry.path)

    if (entry.type === 'Directory') {
      const dirPath = path.join(opts.path, entry.path)
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath)
      }
      return cb()
    }
    // to avoid zip slip (writing outside of the destination), we resolve
    // the target path, and make sure it's nested in the intended
    // destination, or not extract it otherwise.
    const extractPath = path.join(opts.path, entry.path)
    if (extractPath.indexOf(opts.path) !== 0) {
      return cb()
    }

    const writer = opts.getWriter
      ? opts.getWriter({ path: extractPath })
      : Writer({ path: extractPath })

    entry
      .pipe(writer)
      .on('error', cb)
      .on('close', cb)
  }

  const extract = duplexer2(parser, outStream)
  parser.once('crx-header', function(crxHeader) {
    extract.crxHeader = crxHeader
  })

  parser.pipe(outStream).on('finish', function() {
    extract.emit('close')
  })

  extract.promise = function() {
    return new Promise(function(resolve, reject) {
      extract.on('close', resolve)
      extract.on('error', reject)
    })
  }

  return extract
}
