
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border py-12 px-6 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <h3 className="text-xl font-semibold mb-4">TheSet</h3>
          <p className="text-muted-foreground max-w-xs">
            A platform for fans to influence concert setlists through voting, connecting artists with their audience.
          </p>
        </div>
        
        <div>
          <h4 className="text-base font-medium mb-4">Navigation</h4>
          <ul className="space-y-2">
            <li>
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link to="/artists" className="text-muted-foreground hover:text-foreground transition-colors">
                Artists
              </Link>
            </li>
            <li>
              <Link to="/shows" className="text-muted-foreground hover:text-foreground transition-colors">
                Shows
              </Link>
            </li>
          </ul>
        </div>
        
        <div>
          <h4 className="text-base font-medium mb-4">Legal</h4>
          <ul className="space-y-2">
            <li>
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                About
              </Link>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} TheSet. All rights reserved.
        </p>
        
        <div className="mt-4 md:mt-0">
          <p className="text-sm text-muted-foreground">
            Made with passion for music fans worldwide
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
