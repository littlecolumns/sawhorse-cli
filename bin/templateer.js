const Extract = require('./extract-patched')
const request = require('request')
const tmp = require('tmp')
const fs = require('fs-extra')
const path = require('path')
const glob = require('glob')
const url = require('url')

function moveContent(extractionDir, targetDir) {
  glob(path.join(extractionDir, '*'), {}, function(err, files) {
    if (err) {
      return
    }
    console.log('Found', files.map(filename => path.basename(filename)))
    console.log('Replacing content in', targetDir)
    files.forEach(source => {
      const target = path.join(targetDir, path.basename(source))
      fs.move(source, target, { overwrite: true })
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

function extractZip(zipfile, destination) {
  tmp.dir({ prefix: 'sawhorse_' }, (err, extractionDir) => {
    if (err) {
      console.log('Failed to create temporary directory')
      return
    }
    console.log(`Extracting into is ${extractionDir}`)

    fs.createReadStream(zipfile)
      .pipe(Extract({ path: extractionDir }))
      .on('entry', function(filename) {
        console.log(`Extracting ${filename}`)
      })
      .on('close', d => {
        moveContent(extractionDir, destination)
      })
  })
}

function processUrl(url, destination) {
  tmp.file({ prefix: 'sawhorse_', postfix: '.zip' }, (err, zipfile) => {
    if (err) {
      console.log('Failed to create temporary file')
      return
    }

    console.log('Downloading', url)

    request(url)
      .pipe(fs.createWriteStream(zipfile))
      .on('finish', function() {
        console.log(`Saved as ${zipfile}`)
        extractZip(zipfile, destination)
      })
  })
}

function copyContent(sourceDir, destination) {
  tmp.dir({ prefix: 'sawhorse_' }, (err, copyDir) => {
    if (err) {
      console.log('Failed to create temporary directory')
      return
    }
    console.log(`Temporarily copying into is ${copyDir}`)
    fs.copySync(sourceDir, copyDir)
    moveContent(copyDir, destination)
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

function process(source, destination) {
  if (isUrl(source)) {
    processUrl(source, destination)
    return
  }

  if (!fs.existsSync(source)) {
    console.log("Can't find", source)
    return
  }

  const stats = fs.statSync(source)
  if (stats.isFile()) {
    extractZip(source, destination)
  } else {
    copyContent(source, destination)
  }
}

module.exports = {
  process
}
