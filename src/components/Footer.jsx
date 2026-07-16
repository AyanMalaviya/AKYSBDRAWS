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
          <span className="footer-text">&nbsp;(Karimabad JK)</span>
        </div>

        {/* Tester Row (Smaller Font) */}
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
          <span className="footer-text">&nbsp;(Thane JK)</span>
        </div>

      </div>
    </footer>
  )
}