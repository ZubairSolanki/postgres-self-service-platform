import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'

const Dashboard = () => {
  const [databases, setDatabases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newDbName, setNewDbName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newConnectionInfo, setNewConnectionInfo] = useState(null)

  const { logout } = useAuth()
  const navigate = useNavigate()

  const fetchDatabases = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/databases')
      setDatabases(res.data)
    } catch (err) {
      setError('Failed to load databases')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDatabases()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    setNewConnectionInfo(null)
    try {
      const res = await apiClient.post('/databases/create', { name: newDbName })
      setNewConnectionInfo(res.data)
      setNewDbName('')
      fetchDatabases()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create database')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (dbName) => {
    if (!window.confirm(`Delete database "${dbName}"? This cannot be undone.`)) return
    try {
      await apiClient.delete(`/databases/${dbName}`)
      fetchDatabases()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete database')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">My Databases</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Log Out
          </button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Create Database Form */}
        <form
          onSubmit={handleCreate}
          className="bg-white p-6 rounded-lg shadow-sm mb-6 flex gap-3 items-end"
        >
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Database Name
            </label>
            <input
              type="text"
              value={newDbName}
              onChange={(e) => setNewDbName(e.target.value)}
              placeholder="e.g. mydb"
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="bg-blue-600 text-white px-5 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </form>

        {/* Show connection string right after creation */}
        {newConnectionInfo && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
            <p className="text-sm font-medium text-green-800 mb-1">
              Database "{newConnectionInfo.dbName}" created!
            </p>
            <code className="text-xs text-green-900 break-all block bg-white p-2 rounded">
              {newConnectionInfo.connectionString}
            </code>
          </div>
        )}

        {/* Database List */}
        <div className="bg-white rounded-lg shadow-sm">
          {loading ? (
            <p className="p-6 text-gray-500">Loading...</p>
          ) : databases.length === 0 ? (
            <p className="p-6 text-gray-500">No databases yet. Create one above.</p>
          ) : (
            <table className="w-full text-left">
              <thead className="border-b border-gray-200 text-sm text-gray-500">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Owner</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Created</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {databases.map((db) => (
                  <tr key={db.id} className="border-b border-gray-100 last:border-0">
                    <td className="p-4">
  <Link
    to={`/databases/${db.db_name}`}
    className="font-medium text-blue-600 hover:underline"
  >
    {db.db_name}
  </Link>
</td>
                    <td className="p-4 text-gray-600">{db.db_user}</td>
                    <td className="p-4">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          db.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {db.status}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 text-sm">
                      {new Date(db.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      {db.status === 'active' && (
                        <button
                          onClick={() => handleDelete(db.db_name)}
                          className="text-red-600 text-sm hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard