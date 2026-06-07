import React from 'react';
import { FileText, Zap, BarChart3, ShieldCheck } from 'lucide-react';
import './Features.css';

const featuresData = [
  {
    title: 'Structured Requests',
    description: 'Easy form submission for operational funds. Track status from pending to completed in real-time.',
    icon: FileText
  },
  {
    title: 'Real-time Approval Workflow',
    description: 'Admin role management for quick approvals or rejections, eliminating bottlenecks.',
    icon: Zap
  },
  {
    title: 'Comprehensive Reporting',
    description: 'Upload receipts and track every penny spent with detailed expense itemization.',
    icon: BarChart3
  },
  {
    title: 'Role-based Dashboards',
    description: 'Tailored views for Employees and Admins. See exactly what you need, when you need it.',
    icon: ShieldCheck
  }
];

const Features = () => {
  return (
    <section id="features" className="features">
      <div className="container">
        <div className="features-header text-center animate-fade-in-up">
          <h2 className="section-title">Core Features</h2>
          <p className="section-subtitle">Everything you need to manage internal funds efficiently.</p>
        </div>
        
        <div className="features-grid">
          {featuresData.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className={`feature-card glass-panel animate-fade-in-up delay-${(index % 3) + 1}`}>
                <div className="feature-icon-wrapper">
                  <Icon className="feature-icon" size={32} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
