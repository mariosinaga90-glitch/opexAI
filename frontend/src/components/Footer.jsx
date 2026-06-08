import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">
              <span className="logo-icon">▲</span>
              <span className="logo-text">OpexTac</span>
            </div>
            <p>Internal Operational Fund Management System.</p>
          </div>
          
          <div className="footer-links">
            <div className="footer-group">
              <h4>System</h4>
              <a href="#">Dashboard</a>
              <a href="#">Admin Panel</a>
              <a href="#">Status</a>
            </div>
            <div className="footer-group">
              <h4>Support</h4>
              <a href="#">Helpdesk</a>
              <a href="#">Documentation</a>
              <a href="#">Contact IT</a>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} OpexTac Internal Tool. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
