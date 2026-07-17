import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://18.227.177.149:4000/api',
  //  baseURL: 'http://localhost:4000/api',
})

export const setAuthToken = (token) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete apiClient.defaults.headers.common['Authorization']
  }
}

export default apiClient