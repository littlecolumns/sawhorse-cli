#!/usr/bin/env node

const program = require('commander')
const inquirer = require('inquirer')
const request = require('request')
const unzipper = require('unzipper')
const fs = require('fs-extra')
const path = require('path')
const tmp = require('tmp')
const Templateer = require('./templateer')

function buildProject(options) {
  const targetDir = path.resolve('./', options.name)
  if (fs.existsSync(targetDir) && !options.overwrite) {
    return
  }

  const url = 'https://github.com/littlecolumns/sawhorse/archive/master.zip'

  const tmpDir = tmp.dirSync()

  console.log('Downloading and extracting sawhorse source from', url)

  request(url)
    .pipe(unzipper.Extract({ path: tmpDir.name }))
    .on('finish', () => {
      const sourceDir = path.join(tmpDir.name, 'sawhorse-master')
      console.log('Installing base at', targetDir)
      fs.move(sourceDir, targetDir, { overwrite: true })
      if (options.template) {
        console.log('Installing template')
        Templateer.process(options.template, targetDir)
      }
    })
}

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
