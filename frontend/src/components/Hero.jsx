import React from 'react';
import './Hero.css';

const Hero = ({ onOpenLogin }) => {
  return (
    <section className="hero">
      <div className="container hero-container">
        <div className="hero-content animate-fade-in-up">
          <div className="badge">✨ OpexAI Internal Tool</div>
          <h1>Modernize Your<br/>Operational Funds</h1>
          <p className="hero-subtitle delay-1">
            Streamline requests, track real-time approvals, and manage expense reports seamlessly for your entire team. Built for speed, clarity, and accountability.
          </p>
          <div className="hero-cta delay-2">
            <button className="btn btn-primary btn-lg" onClick={onOpenLogin}>Login to App</button>
            <button className="btn btn-secondary btn-lg" onClick={() => window.location.href = '#features'}>View Features</button>
          </div>
          
          <div className="stats delay-3">
            <div className="stat-item">
              <span className="stat-value">100+</span>
              <span className="stat-label">Employees</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">&lt; 2s</span>
              <span className="stat-label">Load Time</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">Real-time</span>
              <span className="stat-label">Approvals</span>
            </div>
          </div>
        </div>
        
        <div className="hero-visual animate-fade-in-up delay-2">
          <div className="mockup-glow"></div>
          <div className="glass-panel mockup">
            <div className="mockup-header">
              <div className="mockup-dots">
                <span></span><span></span><span></span>
              </div>
              <div className="mockup-title">Dashboard Overview</div>
            </div>
            <div className="mockup-body">
              <div className="mockup-sidebar">
                <div className="mockup-item active"></div>
                <div className="mockup-item"></div>
                <div className="mockup-item"></div>
              </div>
              <div className="mockup-main">
                <div className="mockup-cards">
                  <div className="mockup-card glass-panel">
                    <div className="card-title">Pending Requests</div>
                    <div className="card-value highlight">12</div>
                  </div>
                  <div className="mockup-card glass-panel">
                    <div className="card-title">Approved Funds</div>
                    <div className="card-value">Rp 24.5M</div>
                  </div>
                </div>
                <div className="mockup-list glass-panel">
                  <div className="list-item">
                    <div className="list-avatar"></div>
                    <div className="list-details">
                      <div className="list-name">Team Offsite</div>
                      <div className="list-status">Pending Review</div>
                    </div>
                  </div>
                  <div className="list-item">
                    <div className="list-avatar"></div>
                    <div className="list-details">
                      <div className="list-name">Server Maintenance</div>
                      <div className="list-status success">Approved</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
