import React from 'react';
import './Features.css';

const featuresData = [
  {
    title: 'Structured Requests',
    description: 'Easy form submission for operational funds. Track status from pending to completed in real-time.',
    icon: '📝'
  },
  {
    title: 'Real-time Approval Workflow',
    description: 'Admin role management for quick approvals or rejections, eliminating bottlenecks.',
    icon: '⚡'
  },
  {
    title: 'Comprehensive Reporting',
    description: 'Upload receipts and track every penny spent with detailed expense itemization.',
    icon: '📊'
  },
  {
    title: 'Role-based Dashboards',
    description: 'Tailored views for Employees and Admins. See exactly what you need, when you need it.',
    icon: '🛡️'
  }
];

const Features = () => {
  return (
    <section id="features" className="features">
      <div className="container">
        <div className="features-header text-center">
          <h2>Core Features</h2>
          <p>Everything you need to manage internal funds efficiently.</p>
        </div>
        
        <div className="features-grid">
          {featuresData.map((feature, index) => (
            <div key={index} className="feature-card glass-panel">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
