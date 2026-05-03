import { networkInterfaces } from 'os'

function getServerUrls(port) {
  const interfaces = networkInterfaces()
  const urls = []

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family !== 'IPv4' || entry.internal) continue
      urls.push(`http://${entry.address}:${port}`)
    }
  }

  if (!urls.includes(`http://127.0.0.1:${port}`)) {
    urls.push(`http://127.0.0.1:${port}`)
  }

  return urls
}

export { getServerUrls }