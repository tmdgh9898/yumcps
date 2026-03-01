import axios from 'axios'

function unwrap(payload) {
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'success')) {
    if (payload.success) return payload.data
    const message = payload.error?.message || 'Request failed'
    const err = new Error(message)
    err.payload = payload
    throw err
  }
  return payload
}

async function normalize(promise) {
  const response = await promise
  return { ...response, data: unwrap(response.data) }
}

export default {
  get(url, config) {
    return normalize(axios.get(url, config))
  },
  post(url, data, config) {
    return normalize(axios.post(url, data, config))
  },
  put(url, data, config) {
    return normalize(axios.put(url, data, config))
  },
  delete(url, config) {
    return normalize(axios.delete(url, config))
  },
}
