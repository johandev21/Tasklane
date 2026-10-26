import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const children = ['app', 'api'].map((workspace) =>
  Bun.spawn(['bun', 'run', 'dev'], {
    cwd: `${root}${workspace}`,
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  }),
)

let stopping = false
const stopAll = () => {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill()
}

process.once('SIGINT', stopAll)
process.once('SIGTERM', stopAll)
for (const child of children) {
  void child.exited.then((code) => {
    if (code !== 0) process.exitCode = code
    stopAll()
  })
}

const results = await Promise.all(children.map((child) => child.exited))
process.exitCode = results.some((code) => code !== 0) ? 1 : 0
