import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import './Navbar.css';

const Navbar = ({ onOpenLogin }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container navbar-container">
        <div className="logo">
          <span className="logo-icon">▲</span>
          <span className="logo-text">OpexTac</span>
        </div>
        
        {/* Desktop Nav */}
        <div className="nav-links">
          <a href="#features" className="nav-link">Features</a>
          <a href="#about" className="nav-link">About</a>
          <button className="btn btn-primary" onClick={onOpenLogin}>Login to App</button>
        </div>

        {/* Mobile Toggle Icon */}
        <button className="mobile-menu-btn" onClick={toggleMobileMenu} aria-label="Toggle menu">
          {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        {/* Mobile Nav Menu */}
        <div className={`mobile-nav-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="mobile-nav-content">
            <a href="#features" className="mobile-nav-link" onClick={closeMobileMenu}>Features</a>
            <a href="#about" className="mobile-nav-link" onClick={closeMobileMenu}>About</a>
            <button className="btn btn-primary w-full" style={{ width: '100%', marginTop: '1rem' }} onClick={() => { closeMobileMenu(); onOpenLogin(); }}>
              Login to App
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
