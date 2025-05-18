// SizeSelection.js
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import Web3Modal from "web3modal";
import NFTMarketplace from "./NFTMarketplace.json";

const CONTRACT_ADDRESS = "0x4D37f140d12Ccfb3541d50EdE4CBED8f8D6eeF60";

function SizeSelection() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const [nftDetails, setNftDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState("");
  const [shirtSize, setShirtSize] = useState("");
  const [trouserSize, setTrouserSize] = useState("");
  const [showShirtSizeChart, setShowShirtSizeChart] = useState(false);
  const [showTrouserSizeChart, setShowTrouserSizeChart] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hoveredButton, setHoveredButton] = useState(null);

  // Available sizes
  const shirtSizes = ["XS", "S", "M", "L", "XL", "XXL"];
  const trouserSizes = ["28", "30", "32", "34", "36", "38", "40"];

  // Size charts
  const shirtSizeChart = [
    { size: "XS", chest: "34-36", waist: "28-30", length: "26" },
    { size: "S", chest: "36-38", waist: "30-32", length: "27" },
    { size: "M", chest: "38-40", waist: "32-34", length: "28" },
    { size: "L", chest: "40-42", waist: "34-36", length: "29" },
    { size: "XL", chest: "42-44", waist: "36-38", length: "30" },
    { size: "XXL", chest: "44-46", waist: "38-40", length: "31" }
  ];

  const trouserSizeChart = [
    { size: "28", waist: "28", hip: "35", inseam: "30" },
    { size: "30", waist: "30", hip: "37", inseam: "30" },
    { size: "32", waist: "32", hip: "39", inseam: "31" },
    { size: "34", waist: "34", hip: "41", inseam: "31" },
    { size: "36", waist: "36", hip: "43", inseam: "32" },
    { size: "38", waist: "38", hip: "45", inseam: "32" },
    { size: "40", waist: "40", hip: "47", inseam: "33" }
  ];

  // Connect wallet and load NFT details
  useEffect(() => {
    async function init() {
      try {
        const web3Modal = new Web3Modal();
        const connection = await web3Modal.connect();
        const provider = new ethers.providers.Web3Provider(connection);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        setWalletAddress(address.toLowerCase());

        // Load NFT details
        const contract = new ethers.Contract(CONTRACT_ADDRESS, NFTMarketplace.abi, provider);
        const listing = await contract.listings(listingId);
        
        // Check if user owns this NFT
        if (listing.buyer.toLowerCase() !== address.toLowerCase()) {
          alert("You don't own this NFT");
          navigate("/collection");
          return;
        }

        // Load existing size preferences if any
        try {
          const userPreferences = await contract.getUserSizePreferences(listingId);
          if (userPreferences && userPreferences.shirtSize) {
            setShirtSize(userPreferences.shirtSize);
          }
          if (userPreferences && userPreferences.trouserSize) {
            setTrouserSize(userPreferences.trouserSize);
          }
        } catch (error) {
          console.log("No existing size preferences found");
        }

        const imageUrl = listing.imageURL;
        setNftDetails({
          id: listingId,
          tokenId: listing.tokenId.toString(),
          price: ethers.utils.formatEther(listing.price),
          imageUrl: imageUrl,
          seller: listing.seller.toLowerCase(),
          buyer: listing.buyer.toLowerCase(),
          sold: listing.sold,
          redeemed: listing.redeemed
        });

      } catch (error) {
        console.error("Error loading NFT details:", error);
        alert("Error loading NFT details. Please try again.");
        navigate("/collection");
      }
      
      setLoading(false);
    }

    init();
  }, [listingId, navigate]);

  // Extract CID from IPFS URL
  function extractCid(url) {
    if (!url) return "";
    if (url.includes("ipfs/")) {
      const parts = url.split("ipfs/");
      return parts[parts.length - 1];
    } else if (url.startsWith("ipfs://")) {
      return url.replace("ipfs://", "");
    } else if (url.match(/^[a-zA-Z0-9]{46}$/)) {
      return url;
    }
    return url;
  }

  // Save size preferences
  async function saveSizePreferences() {
    if (!shirtSize || !trouserSize) {
      alert("Please select both shirt and trouser sizes");
      return;
    }

    setSaving(true);
    try {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, NFTMarketplace.abi, signer);

      // Call the smart contract function to save size preferences
      // Note: You would need to add this function to your NFTMarketplace contract
      const tx = await contract.setSizePreferences(listingId, shirtSize, trouserSize);
      await tx.wait();

      alert("Size preferences saved successfully!");
      navigate("/collection");
    } catch (error) {
      console.error("Error saving size preferences:", error);
      alert("Error saving size preferences: " + error.message);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loadingContainer">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <div className="headerContainer">
          <h1 className="headerTitle">Set Your Size Preferences</h1>
          <div className="headerActions">
            <div className="walletAddress">
              {walletAddress ? 
                `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 
                "Not Connected"
              }
            </div>
            <Link 
              to="/collection" 
              className="adminButton"
              onMouseEnter={() => setHoveredButton('collection')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              Back to Collection
            </Link>
          </div>
        </div>
      </header>

      <main className="mainContent">
        <div className="sizeSelectionContainer" style={{ display: "flex", gap: "2rem" }}>
          {/* NFT Preview */}
          <div className="nftPreview" style={{ flex: "0 0 300px" }}>
            <div className="card">
              <div className="imageContainer">
                {nftDetails?.imageUrl && (
                  <img
                    src={`https://ipfs.io/ipfs/${extractCid(nftDetails.imageUrl)}`}
                    alt={`NFT ${nftDetails.tokenId}`}
                    className="image"
                    onError={(e) => {
                      console.error("Image failed to load:", e);
                      e.target.src = nftDetails.imageUrl;
                    }}
                  />
                )}
              </div>
              <div className="cardContent">
                <div className="cardHeader">
                  <div className="tokenId">Token ID: {nftDetails?.tokenId}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Size Selection Form */}
          <div className="sizeForm" style={{ flex: "1" }}>
            <div className="formContainer">
              <div className="formContent">
                <h2 style={{ marginBottom: "1.5rem" }}>Select Your Sizes</h2>
                
                {/* Shirt Size Selection */}
                <div className="formGroup">
                  <label htmlFor="shirt-size" className="label">
                    Shirt Size
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <select
                      id="shirt-size"
                      value={shirtSize}
                      onChange={(e) => setShirtSize(e.target.value)}
                      className="input"
                      style={{ flex: "1" }}
                    >
                      <option value="">Select Size</option>
                      {shirtSizes.map(size => (
                        <option key={`shirt-${size}`} value={size}>{size}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowShirtSizeChart(!showShirtSizeChart)}
                      className="adminButton"
                      style={{ flexShrink: 0 }}
                    >
                      {showShirtSizeChart ? "Hide Chart" : "Size Chart"}
                    </button>
                  </div>
                  
                  {/* Shirt Size Chart */}
                  {showShirtSizeChart && (
                    <div className="sizeChart" style={{ marginTop: "1rem", overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th style={{ padding: "0.5rem", border: "1px solid #ddd", backgroundColor: "#f4f4f4" }}>Size</th>
                            <th style={{ padding: "0.5rem", border: "1px solid #ddd", backgroundColor: "#f4f4f4" }}>Chest (in)</th>
                            <th style={{ padding: "0.5rem", border: "1px solid #ddd", backgroundColor: "#f4f4f4" }}>Waist (in)</th>
                            <th style={{ padding: "0.5rem", border: "1px solid #ddd", backgroundColor: "#f4f4f4" }}>Length (in)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shirtSizeChart.map((item, index) => (
                            <tr key={`shirt-row-${index}`} style={{ backgroundColor: shirtSize === item.size ? "#f0f8ff" : "transparent" }}>
                              <td style={{ padding: "0.5rem", border: "1px solid #ddd", fontWeight: shirtSize === item.size ? "bold" : "normal" }}>{item.size}</td>
                              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{item.chest}</td>
                              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{item.waist}</td>
                              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{item.length}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                
                {/* Trouser Size Selection */}
                <div className="formGroup" style={{ marginTop: "1.5rem" }}>
                  <label htmlFor="trouser-size" className="label">
                    Trouser Size
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <select
                      id="trouser-size"
                      value={trouserSize}
                      onChange={(e) => setTrouserSize(e.target.value)}
                      className="input"
                      style={{ flex: "1" }}
                    >
                      <option value="">Select Size</option>
                      {trouserSizes.map(size => (
                        <option key={`trouser-${size}`} value={size}>{size}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowTrouserSizeChart(!showTrouserSizeChart)}
                      className="adminButton"
                      style={{ flexShrink: 0 }}
                    >
                      {showTrouserSizeChart ? "Hide Chart" : "Size Chart"}
                    </button>
                  </div>
                  
                  {/* Trouser Size Chart */}
                  {showTrouserSizeChart && (
                    <div className="sizeChart" style={{ marginTop: "1rem", overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th style={{ padding: "0.5rem", border: "1px solid #ddd", backgroundColor: "#f4f4f4" }}>Size</th>
                            <th style={{ padding: "0.5rem", border: "1px solid #ddd", backgroundColor: "#f4f4f4" }}>Waist (in)</th>
                            <th style={{ padding: "0.5rem", border: "1px solid #ddd", backgroundColor: "#f4f4f4" }}>Hip (in)</th>
                            <th style={{ padding: "0.5rem", border: "1px solid #ddd", backgroundColor: "#f4f4f4" }}>Inseam (in)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trouserSizeChart.map((item, index) => (
                            <tr key={`trouser-row-${index}`} style={{ backgroundColor: trouserSize === item.size ? "#f0f8ff" : "transparent" }}>
                              <td style={{ padding: "0.5rem", border: "1px solid #ddd", fontWeight: trouserSize === item.size ? "bold" : "normal" }}>{item.size}</td>
                              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{item.waist}</td>
                              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{item.hip}</td>
                              <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{item.inseam}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                
                {/* Save Button */}
                <div style={{ marginTop: "2rem" }}>
                  <button
                    onClick={saveSizePreferences}
                    disabled={saving || !shirtSize || !trouserSize}
                    className={saving || !shirtSize || !trouserSize 
                      ? "disabledButton"
                      : `buyButton ${hoveredButton === 'save' ? 'buyButtonHover' : ''}`}
                    onMouseEnter={() => {
                      if (!saving && shirtSize && trouserSize) {
                        setHoveredButton('save');
                      }
                    }}
                    onMouseLeave={() => setHoveredButton(null)}
                    style={{ width: "100%" }}
                  >
                    {saving ? "Saving..." : "Save Size Preferences"}
                  </button>
                </div>

                <div style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#666" }}>
                  <p>Your size information will be used for physical product delivery and will be stored securely.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default SizeSelection;