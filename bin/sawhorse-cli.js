#!/usr/bin/env node

const program = require('commander')
const inquirer = require('inquirer')
const request = require('request')
const fs = require('fs-extra')
const path = require('path')
const tmp = require('tmp')
const Templateer = require('./templateer')
const AdmZip = require('adm-zip')
const glob = require('glob')
const archiver = require('archiver')

function buildProject(options) {
  const targetDir = path.resolve('./', options.name)
  if (fs.existsSync(targetDir) && !options.overwrite) {
    return
  }

  const url = 'https://github.com/littlecolumns/sawhorse/archive/master.zip'

  const tmpZip = tmp.fileSync({ prefix: 'sawhorse_', postfix: '.zip' })
  const tmpDir = tmp.dirSync()

  console.log('Downloading and extracting sawhorse source from', url)

  request(url)
    .pipe(fs.createWriteStream(tmpZip.name))
    .on('finish', () => {
      const zip = new AdmZip(tmpZip.name)
      zip.extractAllTo(tmpDir.name, true)

      const sourceDir = path.join(tmpDir.name, 'sawhorse-master')
      console.log('Installing base at', targetDir)
      fs.moveSync(sourceDir, targetDir, { overwrite: true })
      if (options.template) {
        console.log('Installing template')
        Templateer.process(options.template, targetDir).then(() => {
          console.log('Done')
        })
      }
    })
}

function importTemplate(options) {
  const targetDir = path.resolve('.')
  Templateer.process(options.template, targetDir, options).then(() => {
    console.log('Done')
  })
}

function createTemplate(options) {
  if (!options.include) return
  return new Promise((resolve, reject) => {
    const filename = options.output || 'template.zip'
    const output = fs.createWriteStream(filename)
    const archive = archiver('zip')

    output.on('error', function(err) {
      reject(err)
    })

    output.on('close', function() {
      resolve()
    })
    archive.pipe(output)

    console.log('Scanning for files')
    options.include.forEach(selector => archive.glob(selector))

    console.log('Writing', filename)
    archive.finalize()
  })
}

program
  .command('package')
  .option('-O, --output <path>', 'filename for .zip creation')
  .option('-I, --include <paths>', 'top-level folders to process', value =>
    value.split(',')
  )
  .action(createTemplate)

program
  .command('import')
  .option('-T, --template <path>', 'link to a .zip template file')
  .option('-I, --include <paths>', 'top-level folders to process', value =>
    value.split(',')
  )
  .action(importTemplate)

program
  .command('create <name>')
  .option('-T, --template <path>', 'link to a .zip template file')
  .action((name, options) => {
    const questions = [
      {
        type: 'text',
        name: 'name',
        message: 'Project folder name',
        default: name
      },
      {
        type: 'list',
        name: 'setup',
        message: 'What kind of starter project would you like?',
        choices: [
          {
            name: 'A basic project with a few templates to build on',
            value: 'basic'
          },
          {
            name: 'An empty project',
            value: 'empty'
          },
          {
            name: 'I have a template',
            value: 'template'
          }
        ],
        default: options.template ? 2 : 0
      },
      {
        when: responses => responses.setup == 'template',
        type: 'text',
        name: 'template',
        message: 'Enter template path (folder or zip) or URL (zip only)',
        default: options.template
      },
      {
        when: responses => fs.existsSync(path.join('./', responses.name)),
        type: 'confirm',
        name: 'overwrite',
        message:
          'This project folder already exists, do you want to overwrite it?',
        default: false
      }
    ]
    inquirer.prompt(questions).then(buildProject)
  })

program.parse(process.argv)
