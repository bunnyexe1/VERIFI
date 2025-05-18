import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import { ethers } from "ethers";
import Web3Modal from "web3modal";
import axios from "axios";
import NFTMarketplace from "./NFTMarketplace.json";
import './AppStyles.css';
import { useWallet } from "./hooks/useWallet";
import { useNFTs } from "./hooks/useNFTs";
import { extractCid } from "./utils/ipfs";
import Header from "./components/Header";
import FormInput from "./components/FormInput";

const CONTRACT_ADDRESS = "0x0E55495eBb7b1115F65493Fbd07276dcF856cf20";
const PINATA_API_KEY = "306776bc7e53b9919849";
const PINATA_SECRET_KEY = "5e4e0f567f83838489afd66d67678e48d694062469871ee4f00d9dbcff0ab821";

// Home Component: Displays available NFT listings
function Home() {
  const { walletAddress, connectWallet } = useWallet();
  const { listings, loading, loadNFTs } = useNFTs({ type: "listings" });
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredButton, setHoveredButton] = useState(null);

  useEffect(() => {
    connectWallet();
    loadNFTs();
  }, [connectWallet, loadNFTs]);

  const buyNFT = useCallback(async (listingId, price) => {
    if (!walletAddress) {
      alert("Please connect your wallet");
      return;
    }
    try {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, NFTMarketplace.abi, signer);

      const balance = await provider.getBalance(walletAddress);
      const priceInWei = ethers.utils.parseEther(price);
      if (balance.lt(priceInWei)) {
        throw new Error("Insufficient ETH balance");
      }

      const tx = await contract.buyNFT(listingId, { 
        value: priceInWei, 
        gasLimit: 300000 
      });
      await tx.wait();
      alert("NFT Purchased!");
      loadNFTs();
    } catch (error) {
      console.error("Transaction failed:", error);
      const errorMessage = error.reason || error.message || "Unknown error";
      alert(`Error purchasing NFT: ${errorMessage}`);
    }
  }, [walletAddress, loadNFTs]);

  return (
    <div className="container">
      <Header 
        title="VeriFi" 
        walletAddress={walletAddress}
        links={[
          { to: "/collection", label: "My Collection" },
          { to: "/admin", label: "Admin" },
          { to: "/about", label: "About" },
          { to: "/how-to-use", label: "How to Use" },
        ]}
        hoveredButton={hoveredButton}
        setHoveredButton={setHoveredButton}
      />

      <main className="mainContent">
        {loading ? (
          <div className="loadingContainer">
            <div className="spinner"></div>
          </div>
        ) : listings.length === 0 ? (
          <div className="emptyState">
            <h2 className="emptyStateTitle">No NFTs available.</h2>
            <p className="emptyStateText">Visit the Admin page to list some!</p>
            <Link 
              to="/admin" 
              className="emptyStateButton"
              onMouseEnter={() => setHoveredButton('emptyAdmin')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              Go to Admin
            </Link>
          </div>
        ) : (
          <div className="cardGrid">
            {listings.map((nft) => {
              const cid = extractCid(nft.imageUrl);
              const isOwner = nft.sold && nft.buyer === walletAddress;
              const isHovered = hoveredCard === nft.id;

              return (
                <div
                  key={nft.id}
                  className={`card ${isHovered ? 'cardHover' : ''} ${nft.sold ? 'soldCard' : ''}`}
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
                    {nft.sold && (
                      <div className="statusBadge">
                        Sold
                      </div>
                    )}
                  </div>
                  
                  <div className="cardContent">
                    <div className="cardHeader">
                      <div className="tokenId">Token ID: {nft.tokenId}</div>
                      <div className="price">{nft.price} ETH</div>
                    </div>

                    <div className="sellerInfo">
                      <div className="address">
                        Seller: {nft.seller.slice(0, 6)}...{nft.seller.slice(-4)}
                      </div>
                      {nft.sold && nft.buyer !== "0x0000000000000000000000000000000000000000" && (
                        <div className="address">
                          Buyer: {nft.buyer.slice(0, 6)}...{nft.buyer.slice(-4)}
                        </div>
                      )}
                    </div>

                    {!nft.sold && (
                      <button
                        onClick={() => buyNFT(nft.id, nft.price)}
                        className={`buyButton ${hoveredButton === `buy-${nft.id}` ? 'buyButtonHover' : ''}`}
                        onMouseEnter={() => setHoveredButton(`buy-${nft.id}`)}
                        onMouseLeave={() => setHoveredButton(null)}
                      >
                        Buy Now
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

// Admin Component: Handles NFT creation and listing
function Admin() {
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [nftContract, setNftContract] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewCid, setPreviewCid] = useState("");
  const [filePreview, setFilePreview] = useState(null);
  const [hoveredButton, setHoveredButton] = useState(null);

  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  }, [file]);

  const uploadToPinata = useCallback(async () => {
    if (!file) return null;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
          "Content-Type": "multipart/form-data",
        },
      });
      const cid = res.data.IpfsHash;
      setPreviewCid(cid);
      return cid;
    } catch (error) {
      console.error("Error uploading file to Pinata:", error);
      return null;
    } finally {
      setUploading(false);
    }
  }, [file]);

  const listNFT = useCallback(async () => {
    if (!nftContract || !tokenId || !price || !imageUrl) {
      return alert("Please fill all fields for listing an existing NFT");
    }
    try {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, NFTMarketplace.abi, signer);

      const priceInWei = ethers.utils.parseEther(price);
      const tx = await contract.listNFT(nftContract, tokenId, priceInWei, imageUrl, { gasLimit: 300000 });
      await tx.wait();

      setNftContract("");
      setTokenId("");
      setPrice("");
      setImageUrl("");
      alert("NFT Listed Successfully!");
    } catch (error) {
      console.error("Error listing NFT:", error);
      const errorMessage = error.reason || error.message || "Unknown error";
      alert(`Error listing NFT: ${errorMessage}`);
    }
  }, [nftContract, tokenId, price, imageUrl]);

  const createAndListNFT = useCallback(async () => {
    if (!name || !price || !file) {
      return alert("Please fill all fields for creating a new NFT");
    }
    try {
      const imageCid = await uploadToPinata();
      if (!imageCid) {
        alert("Failed to upload image. Please try again.");
        return;
      }

      const imageUrl = `ipfs://${imageCid}`;
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, NFTMarketplace.abi, signer);

      const priceInWei = ethers.utils.parseEther(price);
      const tx = await contract.createAndListNFT(priceInWei, imageUrl, { gasLimit: 300000 });
      await tx.wait();

      setName("");
      setPrice("");
      setFile(null);
      setFilePreview(null);
      setPreviewCid("");
      alert("NFT Created and Listed Successfully!");
    } catch (error) {
      console.error("Error creating and listing NFT:", error);
      const errorMessage = error.reason || error.message || "Unknown error";
      alert(`Error creating and listing NFT: ${errorMessage}`);
    }
  }, [name, price, file, uploadToPinata]);

  return (
    <div className="container">
      <Header 
        backLink={{ to: "/", label: "Back to Marketplace" }}
        hoveredButton={hoveredButton}
        setHoveredButton={setHoveredButton}
      />

      <main className="adminContainer">
        <div className="formContainer">
          <div className="formHeader">
            <h1 className="formTitle">List Existing NFT</h1>
          </div>
          <div className="formContent">
            <FormInput
              id="nft-contract"
              label="NFT Contract Address"
              placeholder="0x..."
              value={nftContract}
              onChange={setNftContract}
            />
            <FormInput
              id="token-id"
              label="Token ID"
              placeholder="Enter Token ID"
              value={tokenId}
              onChange={setTokenId}
            />
            <FormInput
              id="nft-price"
              label="Price (ETH)"
              placeholder="0.05"
              value={price}
              onChange={setPrice}
            />
            <FormInput
              id="image-url"
              label="Image URL"
              placeholder="ipfs://... or https://..."
              value={imageUrl}
              onChange={setImageUrl}
            />
            <button
              onClick={listNFT}
              disabled={uploading || !nftContract || !tokenId || !price || !imageUrl}
              className={uploading || !nftContract || !tokenId || !price || !imageUrl 
                ? "disabledButton"
                : `buyButton ${hoveredButton === 'list-existing' ? 'buyButtonHover' : ''}`}
              onMouseEnter={() => {
                if (!uploading && nftContract && tokenId && price && imageUrl) {
                  setHoveredButton('list-existing');
                }
              }}
              onMouseLeave={() => setHoveredButton(null)}
            >
              {uploading ? "Listing..." : "List Existing NFT"}
            </button>
          </div>
        </div>

        <div className="formContainer">
          <div className="formHeader">
            <h1 className="formTitle">Create and List New NFT</h1>
          </div>
          <div className="formContent">
            <FormInput
              id="nft-name"
              label="NFT Name"
              placeholder="Enter NFT name"
              value={name}
              onChange={setName}
            />
            <FormInput
              id="new-nft-price"
              label="Price (ETH)"
              placeholder="0.05"
              value={price}
              onChange={setPrice}
            />
            <div className="formGroup">
              <label className="label">NFT Image</label>
              <div className="fileUpload">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="48" 
                  height="48" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="uploadIcon"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <p>Drag & drop your file here, or click to browse</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files[0])}
                  style={{ display: "none" }}
                  id="file-input"
                />
                <button 
                  onClick={() => document.getElementById('file-input').click()}
                  className={`buyButton ${hoveredButton === 'browse' ? 'buyButtonHover' : ''}`}
                  onMouseEnter={() => setHoveredButton('browse')}
                  onMouseLeave={() => setHoveredButton(null)}
                >
                  Browse Files
                </button>
                {file && <p style={{ marginTop: "8px" }}>{file.name}</p>}
              </div>
            </div>
            <button
              onClick={createAndListNFT}
              disabled={uploading || !name || !price || !file}
              className={uploading || !name || !price || !file 
                ? "disabledButton"
                : `buyButton ${hoveredButton === 'create' ? 'buyButtonHover' : ''}`}
              onMouseEnter={() => {
                if (!uploading && name && price && file) {
                  setHoveredButton('create');
                }
              }}
              onMouseLeave={() => setHoveredButton(null)}
            >
              {uploading ? "Uploading & Listing..." : "Create and List NFT"}
            </button>
          </div>
        </div>

        {(filePreview || previewCid) && (
          <div className="previewGrid" style={{ 
            gridTemplateColumns: filePreview && previewCid ? "1fr 1fr" : "1fr" 
          }}>
            {filePreview && (
              <div className="previewCard">
                <h3 className="previewTitle">Local Preview</h3>
                <img src={filePreview} alt="Local Preview" className="previewImage" />
              </div>
            )}
            {previewCid && (
              <div className="previewCard">
                <h3 className="previewTitle">IPFS Preview</h3>
                <img
                  src={`https://ipfs.io/ipfs/${previewCid}`}
                  alt="IPFS Preview"
                  className="previewImage"
                />
                <p className="cidText">CID: {previewCid}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// About Component: Static page with project vision
const About = React.memo(() => {
  const [hoveredButton, setHoveredButton] = useState(null);

  return (
    <div className="container">
      <Header 
        backLink={{ to: "/", label: "Back to Marketplace" }}
        hoveredButton={hoveredButton}
        setHoveredButton={setHoveredButton}
      />
      <main className="aboutContainer">
        <div className="aboutHero">
          <h1 className="aboutTitle">Our Vision: Authenticity in Streetwear</h1>
          <p className="aboutSubtitle">Bridging Digital Ownership with Physical Fashion</p>
        </div>
        <div className="aboutContent">
          <section className="aboutSection">
            <h2 className="sectionTitle">The Problem with Modern Streetwear</h2>
            <p className="sectionText">
              The streetwear industry is flooded with countless brands selling generic t-shirts 
              through print-on-demand strategies, lacking originality and authenticity. 
              Worse yet, counterfeit goods deceive consumers and dilute brand value.
            </p>
          </section>
          <section className="aboutSection">
            <h2 className="sectionTitle">Our Blockchain Solution</h2>
            <p className="sectionText">
              VeriFi revolutionizes collectibles by minting each physical clothing item as an NFT. 
              This creates an immutable record of authenticity and ownership on the blockchain.
            </p>
            <div className="featureGrid">
              <div className="featureCard">
                <h3>Proof of Authenticity</h3>
                <p>Every purchase comes with an NFT that verifies your item is genuine</p>
              </div>
              <div className="featureCard">
                <h3>Digital Twin</h3>
                <p>Own both the physical garment and its digital counterpart</p>
              </div>
              <div className="featureCard">
                <h3>Resale Verification</h3>
                <p>Easily verify authenticity when buying pre-owned items</p>
              </div>
            </div>
          </section>
          <section className="aboutSection">
            <h2 className="sectionTitle">Combating Counterfeit Culture</h2>
            <p className="sectionText">
              By linking each physical product to its NFT, we create an unforgeable chain of custody. 
              When a reseller tries to sell an item, buyers can instantly verify:
            </p>
            <ul className="benefitsList">
              <li>◉ Original purchase history</li>
              <li>◉ Previous ownership records</li>
              <li>◉ Manufacturing details</li>
              <li>◉ Limited edition verification</li>
            </ul>
          </section>
          <section className="aboutSection">
            <h2 className="sectionTitle">The Future of Fashion Ownership</h2>
            <p className="sectionText">
              We're not just selling clothes - we're creating a new standard for fashion authenticity 
              where digital ownership enhances physical products. Each NFT becomes both a certificate 
              of authenticity and a key to exclusive benefits:
            </p>
            <div className="benefitsGrid">
              <div className="benefitCard">
                <h3>Exclusive Drops</h3>
                <p>NFT holders get access to limited future collections</p>
              </div>
              <div className="benefitCard">
                <h3>Community Voting</h3>
                <p>Help decide future designs and brand directions</p>
              </div>
              <div className="benefitCard">
                <h3>Physical Redemption</h3>
                <p>Convert digital assets into premium physical goods</p>
              </div>
            </div>
          </section>
          <div className="ctaSection">
            <h2 className="ctaTitle">Join the Fashion Revolution</h2>
            <p className="ctaText">
              Be part of the movement that's bringing transparency, authenticity, 
              and true ownership back to streetwear culture.
            </p>
            <Link 
              to="/" 
              className={`ctaButton ${hoveredButton === 'explore' ? 'ctaButtonHover' : ''}`}
              onMouseEnter={() => setHoveredButton('explore')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              Explore the Marketplace
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
});

// HowToUse Component: Static guide for using the marketplace
const HowToUse = React.memo(() => {
  const [hoveredButton, setHoveredButton] = useState(null);

  return (
    <div className="container">
      <Header 
        backLink={{ to: "/", label: "Back to Marketplace" }}
        hoveredButton={hoveredButton}
        setHoveredButton={setHoveredButton}
      />
      <main className="howToUseContainer">
        <div className="howToUseHero">
          <h1 className="howToUseTitle">Getting Started with Rare Drip</h1>
          <p className="howToUseSubtitle">A step-by-step guide to using our NFT marketplace</p>
        </div>
        <div className="stepsContainer">
          <div className="stepCard">
            <div className="stepNumber">1</div>
            <div className="stepContent">
              <h3>Install MetaMask</h3>
              <p>First, you'll need a cryptocurrency wallet. We recommend MetaMask, which is available as a browser extension.</p>
              <a 
                href="https://metamask.io/download.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`stepLink ${hoveredButton === 'metamask' ? 'stepLinkHover' : ''}`}
                onMouseEnter={() => setHoveredButton('metamask')}
                onMouseLeave={() => setHoveredButton(null)}
              >
                Download MetaMask
              </a>
            </div>
          </div>
          <div className="stepCard">
            <div className="stepNumber">2</div>
            <div className="stepContent">
              <h3>Connect to Sepolia Testnet</h3>
              <p>Our marketplace operates on the Sepolia test network. In MetaMask:</p>
              <ul className="stepInstructions">
                <li>Click the network dropdown</li>
                <li>Select "Show test networks"</li>
                <li>Choose "Sepolia Test Network"</li>
              </ul>
            </div>
          </div>
          <div className="stepCard">
            <div className="stepNumber">3</div>
            <div className="stepContent">
              <h3>Get Test ETH</h3>
              <p>You'll need Sepolia ETH to make transactions. Visit a faucet to receive test ETH.</p>
              <a 
                href="https://sepoliafaucet.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`stepLink ${hoveredButton === 'faucet' ? 'stepLinkHover' : ''}`}
                onMouseEnter={() => setHoveredButton('faucet')}
                onMouseLeave={() => setHoveredButton(null)}
              >
                Get Sepolia ETH
              </a>
            </div>
          </div>
          <div className="stepCard">
            <div className="stepNumber">4</div>
            <div className="stepContent">
              <h3>Connect Your Wallet</h3>
              <p>Click the "Connect Wallet" button in the top right corner and follow MetaMask prompts.</p>
            </div>
          </div>
          <div className="stepCard">
            <div className="stepNumber">5</div>
            <div className="stepContent">
              <h3>Browse and Buy NFTs</h3>
              <p>Browse available NFTs and click "Buy Now" to purchase using test ETH.</p>
            </div>
          </div>
          <div className="stepCard">
            <div className="stepNumber">6</div>
            <div className="stepContent">
              <h3>View Your Collection</h3>
              <p>Visit "My Collection" to see your owned NFTs.</p>
              <Link 
                to="/collection" 
                className={`stepLink ${hoveredButton === 'collection' ? 'stepLinkHover' : ''}`}
                onMouseEnter={() => setHoveredButton('collection')}
                onMouseLeave={() => setHoveredButton(null)}
              >
                Go to My Collection
              </Link>
            </div>
          </div>
        </div>
        <div className="troubleshooting">
          <h2 className="troubleshootingTitle">Troubleshooting</h2>
          <div className="troubleshootingContent">
            <div className="issueCard">
              <h4>Transactions failing?</h4>
              <p>Ensure you have enough Sepolia ETH and are on the Sepolia network.</p>
            </div>
            <div className="issueCard">
              <h4>Images not loading?</h4>
              <p>IPFS can be slow. Try refreshing or waiting a few moments.</p>
            </div>
            <div className="issueCard">
              <h4>Wallet not connecting?</h4>
              <p>Refresh the page and ensure MetaMask is installed.</p>
            </div>
          </div>
        </div>
        <div className="ctaSection">
          <Link 
            to="/" 
            className={`ctaButton ${hoveredButton === 'explore' ? 'ctaButtonHover' : ''}`}
            onMouseEnter={() => setHoveredButton('explore')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            Start Exploring the Marketplace
          </Link>
        </div>
      </main>
    </div>
  );
});

// Collection Component: Displays owned NFTs with relist option
function Collection() {
  const { walletAddress, connectWallet } = useWallet();
  const { listings: ownedNFTs, loading, loadNFTs: loadOwnedNFTs } = useNFTs({ type: "owned", walletAddress });
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredButton, setHoveredButton] = useState(null);
  const [relistPrice, setRelistPrice] = useState({});
  const [relisting, setRelisting] = useState({});

  useEffect(() => {
    async function init() {
      const address = await connectWallet();
      if (address) loadOwnedNFTs();
    }
    init();
  }, [connectWallet, loadOwnedNFTs]);

  const relistNFT = useCallback(async (listingId, newPrice) => {
    if (!newPrice || isNaN(newPrice) || newPrice <= 0) {
      return alert("Please enter a valid price");
    }
    try {
      setRelisting(prev => ({ ...prev, [listingId]: true }));
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, NFTMarketplace.abi, signer);

      const priceInWei = ethers.utils.parseEther(newPrice.toString());
      const tx = await contract.relistNFT(listingId, priceInWei, { gasLimit: 300000 });
      await tx.wait();

      setRelistPrice(prev => ({ ...prev, [listingId]: "" }));
      alert("NFT Relisted Successfully!");
      loadOwnedNFTs();
    } catch (error) {
      console.error("Error relisting NFT:", error);
      const errorMessage = error.reason || error.message || "Unknown error";
      alert(`Error relisting NFT: ${errorMessage}`);
    } finally {
      setRelisting(prev => ({ ...prev, [listingId]: false }));
    }
  }, [loadOwnedNFTs]);

  return (
    <div className="container">
      <Header 
        title="My Collection"
        walletAddress={walletAddress}
        links={[
          { to: "/", label: "Marketplace" },
          { to: "/about", label: "About" },
          { to: "/how-to-use", label: "How to Use" },
        ]}
        hoveredButton={hoveredButton}
        setHoveredButton={setHoveredButton}
      />
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
                    <div className="relistSection">
                      <input
                        type="text"
                        placeholder="New Price (ETH)"
                        value={relistPrice[nft.id] || ""}
                        onChange={(e) => setRelistPrice(prev => ({
                          ...prev,
                          [nft.id]: e.target.value
                        }))}
                        className="input"
                        style={{ marginBottom: '8px' }}
                      />
                      <button
                        onClick={() => relistNFT(nft.id, relistPrice[nft.id])}
                        disabled={relisting[nft.id] || !relistPrice[nft.id]}
                        className={relisting[nft.id] || !relistPrice[nft.id]
                          ? "disabledButton"
                          : `buyButton ${hoveredButton === `relist-${nft.id}` ? 'buyButtonHover' : ''}`}
                        onMouseEnter={() => {
                          if (!relisting[nft.id] && relistPrice[nft.id]) {
                            setHoveredButton(`relist-${nft.id}`);
                          }
                        }}
                        onMouseLeave={() => setHoveredButton(null)}
                      >
                        {relisting[nft.id] ? "Relisting..." : "Relist NFT"}
                      </button>
                    </div>
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

// Main App Component: Defines routes
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/how-to-use" element={<HowToUse />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  );
}

export default App;