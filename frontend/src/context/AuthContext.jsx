import { createContext, useContext, useState } from 'react'
import { setAuthToken } from '../api/client'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null)

  const login = (newToken) => {
    setToken(newToken)
    setAuthToken(newToken)
  }

  const logout = () => {
    setToken(null)
    setAuthToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)