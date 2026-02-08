import { Link } from 'react-router-dom'
import '../App.css'

function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-hero">
        <div className="landing-badge">BuilderPulsePro</div>
        <h1>Build your next project connection</h1>
        <p className="landing-subtitle">
          Discover opportunities or post jobs for trusted contractors in minutes.
        </p>
        <div className="landing-cta">
          <Link className="button primary" to="/jobs">
            Find a Job
          </Link>
          <Link className="button secondary" to="/jobs/post">
            Post a Job
          </Link>
        </div>
        <nav className="landing-links">
          <Link to="/login">Login</Link>
          <Link to="/signup">Sign Up</Link>
        </nav>
      </header>
    </div>
  )
}

export default LandingPage
