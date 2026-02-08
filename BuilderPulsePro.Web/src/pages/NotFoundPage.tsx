import { Link } from 'react-router-dom'
import '../App.css'

function NotFoundPage() {
  return (
    <div className="page-shell">
      <div className="page-card">
        <p className="page-kicker">404</p>
        <h1 className="page-title">Page not found</h1>
        <p className="page-body">The page you requested doesn't exist yet.</p>
        <div className="page-links">
          <Link to="/">Go to landing</Link>
          <Link to="/jobs">Browse jobs</Link>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
