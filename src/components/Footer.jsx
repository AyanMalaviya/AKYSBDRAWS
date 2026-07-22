import React from 'react'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">

        {/* Main Developer Row */}
        <div className="footer-row main-dev">
          <span className="footer-text">Developed by&nbsp;</span>
          <a
            href="https://www.instagram.com/ayanmalaviya/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link neon-cyan"
          >
            Ayan Malaviya
          </a>
        </div>

        {/* Tester Row */}
        <div className="footer-row sub-dev">
          <span className="footer-text">Tested by&nbsp;</span>
          <a
            href="https://instagram.com/sufyan_hasnani"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link neon-green"
          >
            Sufyan Hasnani
          </a>
        </div>

      </div>
    </footer>
  )
}
