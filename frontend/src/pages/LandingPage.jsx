import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Footer from '../components/Footer';
import LoginModal from '../components/LoginModal';

function LandingPage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <div className="app-container">
      <Navbar onOpenLogin={() => setIsLoginOpen(true)} />
      <main>
        <Hero onOpenLogin={() => setIsLoginOpen(true)} />
        <Features />
      </main>
      <Footer />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
}

export default LandingPage;
