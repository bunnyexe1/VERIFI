import React from "react";
import { Link } from "react-router-dom";

function Header({ title, walletAddress, links = [], backLink, hoveredButton, setHoveredButton }) {
  return (
    <header className="header">
      <div className="headerContainer">
        {backLink ? (
          <Link 
            to={backLink.to} 
            className="backLink"
            onMouseEnter={() => setHoveredButton('back')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <span className="backIcon">←</span> {backLink.label}
          </Link>
        ) : (
          <>
            <h1 className="headerTitle">{title}</h1>
            <div className="headerActions">
              <div className="walletAddress">
                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Not Connected"}
              </div>
              {links.map(link => (
                <Link 
                  key={link.to}
                  to={link.to}
                  className="adminButton"
                  onMouseEnter={() => setHoveredButton(link.label.toLowerCase())}
                  onMouseLeave={() => setHoveredButton(null)}
                  style={{ marginRight: '10px' }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </header>
  );
}

export default Header;