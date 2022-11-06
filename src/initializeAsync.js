import glob from 'glob'
import path from 'path'
import fs from 'fs'
import flatten from 'lodash/flatten'
import uniq from 'lodash/uniq'
import { DIRECTORIES, PATTERNS, EXTENSIONS, formatPath,  } from './platform'

const REINDEX_TIME = 30 * 60 * 1000

export const  getAppsList = () => {
  let patterns = DIRECTORIES.map(dir =>
    path.join(dir, '**', `*.+(${EXTENSIONS.join('|')})`)
  )
  patterns = [
    ...patterns,
    ...(PATTERNS || [])
  ]
  const promises = patterns.map(pattern => (
    new Promise((resolve, reject) => {
      glob(pattern, {}, (err, files) => {
        return err ? reject(err) : resolve(files)
      })
    })
  ))
  return Promise.all(promises).then(apps =>{
    const appsList1 =  uniq(flatten(apps)).filter(app=>fs.lstatSync(app).isFile()||fs.lstatSync(app).isSymbolicLink())
    const appsList = appsList1.map(formatPath).filter(app => !app.hidden)
    return appsList
  } 
  ).catch(err => {
    console.error("Error while getting apps list", err)
  })
}

export default (callback) => {
  const searchApps = () => getAppsList().then(apps => {
    const json = JSON.stringify(apps, null, 2)
    callback(apps)
  })

  setInterval(searchApps, REINDEX_TIME)
  searchApps()
  DIRECTORIES.forEach(dir => fs.watch(dir, {}, searchApps))
}

