/** The platform mechanisms that the seed of the arduino-cli data folder drives. */
export interface ArduinoSeedMechanisms {
  /** Joins path segments with the separator of the platform. */
  join(...segments: string[]): string
  exists(path: string): Promise<boolean>
  /** The names of the entries in a folder. Throws when the folder does not exist. */
  list(dir: string): Promise<string[]>
  /**
   * Copies a folder tree. With `overwrite` false, a file that is already at
   * the destination stays. `skip` is a source path that the copy leaves out,
   * with all that is under it.
   */
  copyTree(source: string, destination: string, options: { overwrite: boolean; skip?: string }): Promise<void>
  /** Removes a file or a folder tree. Does nothing when the path does not exist. */
  remove(path: string): Promise<void>
  rename(from: string, to: string): Promise<void>
}
