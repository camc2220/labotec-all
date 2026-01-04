import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'https://happy-upliftment-production-5f17.up.railway.app:8080'
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')

  if (!config.headers) {
    config.headers = {}
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else {
    delete config.headers.Authorization
  }

  return config
})

export default api
