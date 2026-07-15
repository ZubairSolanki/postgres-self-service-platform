import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '../api/client'

const formatDate = (dateString) => {
  const d = new Date(dateString)
  const pad = (n) => String(n).padStart(2, '0')
  const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
  const time = d.toLocaleTimeString()
  return `${date} ${time}`
}

const DatabaseDetail = () => {
  const { dbName } = useParams()
  const navigate = useNavigate()

  const [usage, setUsage] = useState(null)
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [backingUp, setBackingUp] = useState(false)
  const [restoring, setRestoring] = useState(null)
  const [resetting, setResetting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [newConnectionInfo, setNewConnectionInfo] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [usageRes, backupsRes] = await Promise.all([
        apiClient.get(`/databases/${dbName}/usage`),
        apiClient.get(`/backups/${dbName}`),
      ])
      setUsage(usageRes.data)
      setBackups(backupsRes.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load database details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [dbName])

  const handleBackup = async () => {
    setBackingUp(true)
    setError('')
    try {
      await apiClient.post(`/backups/${dbName}`)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.error || 'Backup failed')
    } finally {
      setBackingUp(false)
    }
  }

  const handleRestore = async (fileName) => {
    if (!window.confirm(`Restore from "${fileName}"? This will run the backup's SQL against the live database.`)) return
    setRestoring(fileName)
    setError('')
    try {
      await apiClient.post(`/backups/${dbName}/restore/${fileName}`)
      alert('Restore complete')
    } catch (err) {
      setError(err.response?.data?.error || 'Restore failed')
    } finally {
      setRestoring(null)
    }
  }

  const handleDownload = async (fileName) => {
    try {
      const res = await apiClient.get(`/backups/${dbName}/download/${fileName}`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Download failed')
    }
  }

  const handleResetPassword = async () => {
    if (!window.confirm('Reset password for this database? The old credentials will stop working immediately.')) return
    setResetting(true)
    setError('')
    setNewConnectionInfo(null)
    try {
      const res = await apiClient.post(`/databases/${dbName}/reset-password`)
      setNewConnectionInfo(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Reset password failed')
    } finally {
      setResetting(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete database "${dbName}"? This cannot be undone.`)) return
    setDeleting(true)
    setError('')
    try {
      await apiClient.delete(`/databases/${dbName}`)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed')
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-100 p-8 text-gray-500">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          ← Back to Dashboard
        </button>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{dbName}</h1>
          <div className="flex gap-3">
            <button
              onClick={handleResetPassword}
              disabled={resetting}
              className="text-sm bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              {resetting ? 'Resetting...' : 'Reset Password'}
            </button>
            {/* <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Database'}
            </button> */}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-3 rounded mb-4">
            {error}
          </div>
        )}

        {newConnectionInfo && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
            <p className="text-sm font-medium text-green-800 mb-1">
              Password reset. New connection string:
            </p>
            <code className="text-xs text-green-900 break-all block bg-white p-2 rounded">
              {newConnectionInfo.connectionString}
            </code>
          </div>
        )}

        {/* Usage Stats */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Database Size</p>
            <p className="text-xl font-semibold text-gray-800">{usage?.size ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Active Connections</p>
            <p className="text-xl font-semibold text-gray-800">{usage?.activeConnections ?? '—'}</p>
          </div>
        </div>

        {/* Backups Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Backups</h2>
            <button
              onClick={handleBackup}
              disabled={backingUp}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {backingUp ? 'Backing up...' : 'Create Backup'}
            </button>
          </div>

          {backups.length === 0 ? (
            <p className="text-gray-500 text-sm">No backups yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {backups.map((b) => (
                <li key={b.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{b.file_name}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(b.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleDownload(b.file_name)}
                      className="text-sm text-gray-600 hover:underline"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleRestore(b.file_name)}
                      disabled={restoring === b.file_name}
                      className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                    >
                      {restoring === b.file_name ? 'Restoring...' : 'Restore'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default DatabaseDetail