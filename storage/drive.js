import Hyperdrive from 'hyperdrive'
import Corestore from 'corestore'

export function createCorestore (rootDir) {
  return new Corestore(rootDir)
}

export function createOwnerDrive (corestore) {
  const drive = new Hyperdrive(corestore.namespace('estate'))
  return drive
}

export function replicateOwnerDrive (corestore, driveKey) {
  const drive = new Hyperdrive(corestore.namespace('estate'), driveKey)
  return drive
}
