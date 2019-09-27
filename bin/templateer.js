const AdmZip = require('adm-zip')
const request = require('request')
const tmp = require('tmp')
const fs = require('fs-extra')
const path = require('path')
const glob = require('glob')
const url = require('url')

function moveContent(extractionDir, targetDir, options = {}) {
  glob(path.join(extractionDir, '*'), {}, function(err, files) {
    if (err) {
      return
    }
    console.log('Found', files.map(filename => path.basename(filename)))
    console.log('Replacing content in', targetDir)
    files.forEach(source => {
      console.log(options.include)
      const skip =
        options.include && !options.include.find(str => source.includes(str))
      if (skip) {
        console.log('Skipping', path.basename(source))
        return
      }
      const target = path.join(targetDir, path.basename(source))
      fs.moveSync(source, target, { overwrite: true })
    })
    const relativeTarget = path.relative('./', targetDir)
    console.log('Done!')
    console.log('Run the following commands to get started:')
    console.log('')
    console.log(`    cd ${relativeTarget}`)
    console.log('    npm install')
    console.log('    npm run start')
    console.log('')
  })
}

function extractZip(zipfile) {
  return new Promise((resolve, reject) => {
    tmp.dir({ prefix: 'sawhorse_' }, (err, extractionDir) => {
      if (err) {
        reject(err)
        return
      }
      console.log(`Extracting into ${extractionDir}`)

      const zip = AdmZip(zipfile)
      zip.extractAllTo(extractionDir)
      resolve(extractionDir)
    })
  })
}

function processUrl(url) {
  return new Promise((resolve, reject) => {
    tmp.file({ prefix: 'sawhorse_', postfix: '.zip' }, (err, zipfile) => {
      if (err) {
        reject(err)
        return
      }

      console.log('Downloading', url)

      request(url)
        .pipe(fs.createWriteStream(zipfile))
        .on('finish', function() {
          console.log(`Saved as ${zipfile}`)
          resolve(zipfile)
        })
    })
  })
}

function copyToTempDir(sourceDir) {
  return new Promise((resolve, reject) => {
    tmp.dir({ prefix: 'sawhorse_' }, (err, copyDir) => {
      if (err) {
        reject(err)
        return
      }
      console.log(`Temporarily copying into is ${copyDir}`)
      fs.copySync(sourceDir, copyDir)
      resolve(copyDir)
    })
  })
}

function isUrl(source) {
  try {
    new url.URL(source)
    return true
  } catch {
    return false
  }
}

function process(source, destination, options) {
  function sendToDestination(contentSource) {
    return moveContent(contentSource, destination, options)
  }

  if (isUrl(source)) {
    return processUrl(source)
      .then(extractZip)
      .then(sendToDestination)
  }

  if (!fs.existsSync(source)) {
    console.log("Can't find", source)
    return
  }

  const stats = fs.statSync(source)
  if (stats.isFile()) {
    return extractZip(source).then(sendToDestination)
  } else {
    return copyToTempDir(source).then(sendToDestination)
  }
}

module.exports = {
  process
}
