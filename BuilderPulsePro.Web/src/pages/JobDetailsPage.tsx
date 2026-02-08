import { Link, useParams } from 'react-router-dom'
import '../App.css'

function JobDetailsPage() {
  const { jobId } = useParams()

  return (
    <div className="page-shell">
      <div className="page-card">
        <p className="page-kicker">Job details</p>
        <h1 className="page-title">Job {jobId}</h1>
        <p className="page-body">
          Share this link with another contractor to review the opportunity and coordinate bids.
        </p>
        <div className="page-links">
          <Link to="/jobs">Back to jobs</Link>
          <Link to="/jobs/post">Post another job</Link>
        </div>
      </div>
    </div>
  )
}

export default JobDetailsPage
