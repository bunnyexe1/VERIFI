// Add this new component to your project as OwnedNFTs.js
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import Web3Modal from "web3modal";
import NFTMarketplace from "./NFTMarketplace.json";
import './AppStyles.css'; // Reusing your existing styles

const CONTRACT_ADDRESS = "0x4D37f140d12Ccfb3541d50EdE4CBED8f8D6eeF60";

function OwnedNFTs() {
  const [ownedNFTs, setOwnedNFTs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState("");
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredButton, setHoveredButton] = useState(null);

  const connectWallet = useCallback(async () => {
    try {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address.toLowerCase());
      return address.toLowerCase();
    } catch (error) {
      console.error("Wallet connection failed:", error);
      return null;
    }
  }, []);

  const loadOwnedNFTs = useCallback(async (address) => {
    if (!address) return;
    
    setLoading(true);
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, NFTMarketplace.abi, provider);
      const count = await contract.listingCount();

      let items = [];
      for (let i = 0; i < count; i++) {
        const listing = await contract.listings(i);
        if (listing.buyer.toLowerCase() === address.toLowerCase() && listing.sold) {
          const imageUrl = listing.imageURL;
          items.push({
            id: i,
            tokenId: listing.tokenId.toString(),
            price: ethers.utils.formatEther(listing.price),
            imageUrl: imageUrl,
            seller: listing.seller.toLowerCase(),
            buyer: listing.buyer.toLowerCase(),
            sold: listing.sold,
            redeemed: listing.redeemed
          });
        }
      }
      setOwnedNFTs(items);
    } catch (error) {
      console.error("Error loading owned NFTs:", error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const address = await connectWallet();
      if (address) {
        loadOwnedNFTs(address);
      }
    }
    init();
  }, [connectWallet, loadOwnedNFTs]);

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

  async function redeemNFT(listingId) {
    try {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, NFTMarketplace.abi, signer);

      const tx = await contract.redeemNFT(listingId);
      await tx.wait();
      alert("Physical redemption request submitted!");
      const address = await signer.getAddress();
      loadOwnedNFTs(address.toLowerCase());
    } catch (error) {
      console.error("Redemption failed:", error);
      alert("Error redeeming NFT: " + error.message);
    }
  }

  return (
    <div className="container">
      <header className="header">
        <div className="headerContainer">
          <h1 className="headerTitle">My Collection</h1>
          <div className="headerActions">
            <div className="walletAddress">
              {walletAddress ? 
                `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 
                "Not Connected"
              }
            </div>
            <Link 
              to="/" 
              className="adminButton"
              onMouseEnter={() => setHoveredButton('marketplace')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              Marketplace
            </Link>
          </div>
        </div>
      </header>

      <main className="mainContent">
        {loading ? (
          <div className="loadingContainer">
            <div className="spinner"></div>
          </div>
        ) : ownedNFTs.length === 0 ? (
          <div className="emptyState">
            <h2 className="emptyStateTitle">No NFTs in your collection.</h2>
            <p className="emptyStateText">Visit the Marketplace to buy some!</p>
            <Link 
              to="/" 
              className="emptyStateButton"
              onMouseEnter={() => setHoveredButton('emptyMarketplace')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              Go to Marketplace
            </Link>
          </div>
        ) : (
          <div className="cardGrid">
            {ownedNFTs.map((nft) => {
              const cid = extractCid(nft.imageUrl);
              const isHovered = hoveredCard === nft.id;

              return (
                <div
                  key={nft.id}
                  className={`card ${isHovered ? 'cardHover' : ''}`}
                  onMouseEnter={() => setHoveredCard(nft.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div className="imageContainer">
                    {cid ? (
                      <img
                        src={`https://ipfs.io/ipfs/${cid}`}
                        alt={`NFT ${nft.tokenId}`}
                        className="image"
                        onError={(e) => {
                          console.error("Image failed to load:", e);
                          e.target.src = nft.imageUrl;
                        }}
                      />
                    ) : (
                      <img 
                        src={nft.imageUrl} 
                        alt={`NFT ${nft.tokenId}`} 
                        className="image" 
                      />
                    )}
                    {nft.redeemed && (
                      <div className="statusBadge">
                        Redeemed
                      </div>
                    )}
                  </div>
                  
                  <div className="cardContent">
                    <div className="cardHeader">
                      <div className="tokenId">Token ID: {nft.tokenId}</div>
                      <div className="price">Purchased for {nft.price} ETH</div>
                    </div>

                    <div className="sellerInfo">
                      <div className="address">
                        Seller: {nft.seller.slice(0, 6)}...{nft.seller.slice(-4)}
                      </div>
                    </div>

                    {!nft.redeemed && (
                      <button
                        onClick={() => redeemNFT(nft.id)}
                        className={`redeemButton ${hoveredButton === `redeem-${nft.id}` ? 'redeemButtonHover' : ''}`}
                        onMouseEnter={() => setHoveredButton(`redeem-${nft.id}`)}
                        onMouseLeave={() => setHoveredButton(null)}
                      >
                        Request Physical Delivery
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default OwnedNFTs;