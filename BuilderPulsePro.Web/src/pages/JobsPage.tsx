import { Link } from 'react-router-dom'
import '../App.css'

const jobs = [
  { id: 'bpp-1201', title: 'Kitchen remodel', trade: 'Carpentry' },
  { id: 'bpp-1202', title: 'Roof repair', trade: 'Roofing' },
  { id: 'bpp-1203', title: 'Basement waterproofing', trade: 'Masonry' },
]

function JobsPage() {
  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <div>
            <p className="page-kicker">Jobs</p>
            <h1 className="page-title">Open roles ready for bids</h1>
          </div>
          <Link className="button primary" to="/jobs/post">
            Post a Job
          </Link>
        </div>
        <ul className="job-listing">
          {jobs.map((job) => (
            <li key={job.id} className="job-row">
              <div>
                <strong>{job.title}</strong>
                <span className="job-meta">{job.trade}</span>
              </div>
              <Link className="link" to={`/jobs/${job.id}`}>
                View details
              </Link>
            </li>
          ))}
        </ul>
        <div className="page-links">
          <Link to="/">Back to landing</Link>
        </div>
      </div>
    </div>
  )
}

export default JobsPage
