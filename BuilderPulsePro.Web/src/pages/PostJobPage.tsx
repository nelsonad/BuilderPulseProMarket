import { Link } from 'react-router-dom'
import '../App.css'

function PostJobPage() {
  return (
    <div className="page-shell">
      <div className="page-card">
        <p className="page-kicker">Post a job</p>
        <h1 className="page-title">Share your next project</h1>
        <p className="page-body">
          Add project details, location, and trade requirements to connect with qualified contractors.
        </p>
        <div className="page-links">
          <Link to="/jobs">Browse jobs</Link>
          <Link to="/">Back to landing</Link>
        </div>
      </div>
    </div>
  )
}

export default PostJobPage
