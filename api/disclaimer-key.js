import { createHash } from 'node:crypto'

export default function handler(request, response) {
  const forwardedFor = request.headers['x-forwarded-for']
  const rawIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor || request.socket?.remoteAddress || 'unknown'
  const ip = String(rawIp).split(',')[0].trim() || 'unknown'
  const day = new Date().toISOString().slice(0, 10)
  const key = createHash('sha256')
    .update(`${ip}:${day}:cerchiami-disclaimer`)
    .digest('hex')
    .slice(0, 32)

  response.setHeader('Cache-Control', 'private, no-store')
  response.status(200).json({ key, day })
}
