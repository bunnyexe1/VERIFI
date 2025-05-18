import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ethers } from "ethers";
import Web3Modal from "web3modal";
import NFTMarketplace from "./NFTMarketplace.json";
import "./PhysicalDeliveryStyles.css";

const CONTRACT_ADDRESS = "0x4D37f140d12Ccfb3541d50EdE4CBED8f8D6eeF60";

function PhysicalDelivery() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const [nftDetails, setNftDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState("");
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    email: "",
    phone: ""
  });
  const [step, setStep] = useState(1); // 1: Size Selection, 2: Shipping, 3: Payment, 4: Confirmation
  const [formError, setFormError] = useState("");
  const [transactionPending, setTransactionPending] = useState(false);
  
  const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
  const sizeChartData = {
    "XS": { chest: "34-36", waist: "28-30", hips: "34-36" },
    "S": { chest: "36-38", waist: "30-32", hips: "36-38" },
    "M": { chest: "38-40", waist: "32-34", hips: "38-40" },
    "L": { chest: "40-42", waist: "34-36", hips: "40-42" },
    "XL": { chest: "42-44", waist: "36-38", hips: "42-44" },
    "XXL": { chest: "44-46", waist: "38-40", hips: "44-46" }
  };

  useEffect(() => {
    const fetchNftDetails = async () => {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, NFTMarketplace.abi, provider);
        const listing = await contract.listings(listingId);
        
        // Verify that the current wallet address is the buyer
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        
        if (listing.buyer.toLowerCase() !== address.toLowerCase()) {
          alert("You are not the owner of this NFT");
          navigate("/collection");
          return;
        }
        
        if (listing.redeemed) {
          alert("This NFT has already been redeemed");
          navigate("/collection");
          return;
        }

        const imageUrl = listing.imageURL;
        let cid = "";
        if (imageUrl.includes("ipfs/")) {
          const parts = imageUrl.split("ipfs/");
          cid = parts[parts.length - 1];
        } else if (imageUrl.startsWith("ipfs://")) {
          cid = imageUrl.replace("ipfs://", "");
        } else if (imageUrl.match(/^[a-zA-Z0-9]{46}$/)) {
          cid = imageUrl;
        }

        setNftDetails({
          id: Number(listingId),
          tokenId: listing.tokenId.toString(),
          price: ethers.utils.formatEther(listing.price),
          imageUrl: imageUrl,
          imageCid: cid,
          seller: listing.seller.toLowerCase(),
          owner: address.toLowerCase()
        });
      } catch (error) {
        console.error("Error fetching NFT details:", error);
        alert("Failed to load NFT details");
        navigate("/collection");
      } finally {
        setLoading(false);
      }
    };

    if (listingId) {
      fetchNftDetails();
    }
  }, [listingId, navigate]);

  const handleSizeChange = (size) => {
    setSelectedSize(size);
    setFormError("");
  };

  const handleShippingInfoChange = (e) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({ ...prev, [name]: value }));
    setFormError("");
  };

  const validateForm = () => {
    if (step === 1 && !selectedSize) {
      setFormError("Please select a size");
      return false;
    }
    
    if (step === 2) {
      const requiredFields = ["name", "address", "city", "state", "zip", "country", "email"];
      for (const field of requiredFields) {
        if (!shippingInfo[field]) {
          setFormError(`Please enter your ${field}`);
          return false;
        }
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(shippingInfo.email)) {
        setFormError("Please enter a valid email address");
        return false;
      }
    }
    
    return true;
  };

  const handleNext = () => {
    if (!validateForm()) return;
    setStep(prevStep => prevStep + 1);
  };

  const handleBack = () => {
    setStep(prevStep => prevStep - 1);
  };

  const handleRedeemNFT = async () => {
    if (transactionPending) return;
    
    try {
      setTransactionPending(true);
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, NFTMarketplace.abi, signer);

      // Store size and shipping info (in a real app, you'd likely store this in a database)
      // For this demo, we're just console logging it
      console.log("Redemption details:", {
        listingId,
        size: selectedSize,
        shippingInfo
      });

      // Call smart contract to mark NFT as redeemed
      const tx = await contract.redeemNFT(listingId);
      await tx.wait();
      
      // Move to confirmation step
      setStep(4);
    } catch (error) {
      console.error("Redemption failed:", error);
      alert("Error redeeming NFT: " + error.message);
    } finally {
      setTransactionPending(false);
    }
  };

  const renderSizeSelection = () => (
    <div className="sizeSelectionContainer">
      <h2 className="sectionTitle">Select Your Size</h2>
      
      <div className="sizesContainer">
        {sizes.map(size => (
          <div 
            key={size} 
            className={`sizeOption ${selectedSize === size ? 'selectedSize' : ''}`}
            onClick={() => handleSizeChange(size)}
          >
            {size}
          </div>
        ))}
      </div>
      
      <button 
        className="sizeChartButton" 
        onClick={() => setShowSizeChart(!showSizeChart)}
      >
        {showSizeChart ? "Hide Size Chart" : "View Size Chart"}
      </button>
      
      {showSizeChart && (
        <div className="sizeChartContainer">
          <h3 className="sizeChartTitle">Size Chart (inches)</h3>
          <table className="sizeChart">
            <thead>
              <tr>
                <th>Size</th>
                <th>Chest</th>
                <th>Waist</th>
                <th>Hips</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(sizeChartData).map(([size, measurements]) => (
                <tr key={size}>
                  <td>{size}</td>
                  <td>{measurements.chest}</td>
                  <td>{measurements.waist}</td>
                  <td>{measurements.hips}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {formError && <div className="formError">{formError}</div>}
      
      <div className="navigationButtons">
        <Link to="/collection" className="backButton">Cancel</Link>
        <button 
          className="nextButton" 
          onClick={handleNext}
          disabled={!selectedSize}
        >
          Next: Shipping Info
        </button>
      </div>
    </div>
  );

  const renderShippingInfo = () => (
    <div className="shippingInfoContainer">
      <h2 className="sectionTitle">Shipping Information</h2>
      
      <form className="shippingForm">
        <div className="formRow">
          <div className="formGroup">
            <label htmlFor="name">Full Name *</label>
            <input 
              type="text" 
              id="name" 
              name="name"
              value={shippingInfo.name}
              onChange={handleShippingInfoChange}
              required
            />
          </div>
        </div>
        
        <div className="formRow">
          <div className="formGroup">
            <label htmlFor="email">Email *</label>
            <input 
              type="email" 
              id="email" 
              name="email"
              value={shippingInfo.email}
              onChange={handleShippingInfoChange}
              required
            />
          </div>
          
          <div className="formGroup">
            <label htmlFor="phone">Phone Number</label>
            <input 
              type="tel" 
              id="phone" 
              name="phone"
              value={shippingInfo.phone}
              onChange={handleShippingInfoChange}
            />
          </div>
        </div>
        
        <div className="formRow">
          <div className="formGroup">
            <label htmlFor="address">Street Address *</label>
            <input 
              type="text" 
              id="address" 
              name="address"
              value={shippingInfo.address}
              onChange={handleShippingInfoChange}
              required
            />
          </div>
        </div>
        
        <div className="formRow">
          <div className="formGroup">
            <label htmlFor="city">City *</label>
            <input 
              type="text" 
              id="city" 
              name="city"
              value={shippingInfo.city}
              onChange={handleShippingInfoChange}
              required
            />
          </div>
          
          <div className="formGroup">
            <label htmlFor="state">State/Province *</label>
            <input 
              type="text" 
              id="state" 
              name="state"
              value={shippingInfo.state}
              onChange={handleShippingInfoChange}
              required
            />
          </div>
        </div>
        
        <div className="formRow">
          <div className="formGroup">
            <label htmlFor="zip">ZIP/Postal Code *</label>
            <input 
              type="text" 
              id="zip" 
              name="zip"
              value={shippingInfo.zip}
              onChange={handleShippingInfoChange}
              required
            />
          </div>
          
          <div className="formGroup">
            <label htmlFor="country">Country *</label>
            <input 
              type="text" 
              id="country" 
              name="country"
              value={shippingInfo.country}
              onChange={handleShippingInfoChange}
              required
            />
          </div>
        </div>
      </form>
      
      {formError && <div className="formError">{formError}</div>}
      
      <div className="navigationButtons">
        <button className="backButton" onClick={handleBack}>Back</button>
        <button 
          className="nextButton" 
          onClick={handleNext}
        >
          Next: Payment
        </button>
      </div>
    </div>
  );

  const renderPayment = () => (
    <div className="paymentContainer">
      <h2 className="sectionTitle">Shipping & Handling Fee</h2>
      
      <div className="orderSummary">
        <div className="orderDetail">
          <span>Item</span>
          <span>NFT #{nftDetails.tokenId}</span>
        </div>
        <div className="orderDetail">
          <span>Size</span>
          <span>{selectedSize}</span>
        </div>
        <div className="orderDetail">
          <span>Shipping Address</span>
          <span>
            {shippingInfo.name}<br />
            {shippingInfo.address}<br />
            {shippingInfo.city}, {shippingInfo.state} {shippingInfo.zip}<br />
            {shippingInfo.country}
          </span>
        </div>
        <div className="orderDetail shippingFee">
          <span>Shipping & Handling Fee</span>
          <span>0.01 ETH</span>
        </div>
      </div>
      
      <div className="paymentMethods">
        <h3>Payment Method</h3>
        <div className="paymentMethod selected">
          <div className="paymentMethodIcon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
          <div className="paymentMethodDetails">
            <span>Pay with ETH</span>
            <span>Transaction will be processed on the blockchain</span>
          </div>
        </div>
      </div>
      
      <div className="navigationButtons">
        <button className="backButton" onClick={handleBack}>Back</button>
        <button 
          className={`nextButton ${transactionPending ? 'buttonLoading' : ''}`} 
          onClick={handleRedeemNFT}
          disabled={transactionPending}
        >
          {transactionPending ? "Processing..." : "Complete Redemption"}
        </button>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="confirmationContainer">
      <div className="confirmationIcon">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      </div>
      
      <h2 className="confirmationTitle">Redemption Successful!</h2>
      
      <p className="confirmationDescription">
        Your physical item will be shipped to the address you provided in your selected size. 
        You will receive a confirmation email shortly with tracking information.
      </p>
      
      <div className="confirmationDetails">
        <div className="confirmationDetail">
          <span>Order ID:</span>
          <span>{`RD-${Date.now().toString().slice(-8)}`}</span>
        </div>
        <div className="confirmationDetail">
          <span>NFT ID:</span>
          <span>#{nftDetails.tokenId}</span>
        </div>
        <div className="confirmationDetail">
          <span>Size:</span>
          <span>{selectedSize}</span>
        </div>
        <div className="confirmationDetail">
          <span>Shipping Address:</span>
          <span>
            {shippingInfo.name}<br />
            {shippingInfo.address}<br />
            {shippingInfo.city}, {shippingInfo.state} {shippingInfo.zip}<br />
            {shippingInfo.country}
          </span>
        </div>
      </div>
      
      <Link to="/collection" className="returnButton">
        Return to Collection
      </Link>
    </div>
  );

  if (loading) {
    return (
      <div className="loadingContainer">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!nftDetails) {
    return (
      <div className="errorContainer">
        <h2>NFT not found or you are not the owner</h2>
        <Link to="/collection" className="returnButton">
          Return to Collection
        </Link>
      </div>
    );
  }

  return (
    <div className="physicalDeliveryContainer">
      <header className="deliveryHeader">
        <Link to="/collection" className="headerBackLink">
          ← Back to Collection
        </Link>
        <h1 className="headerTitle">Physical Item Redemption</h1>
      </header>
      
      <div className="contentContainer">
        <div className="nftPreview">
          <div className="nftImageContainer">
            {nftDetails.imageCid ? (
              <img
                src={`https://ipfs.io/ipfs/${nftDetails.imageCid}`}
                alt={`NFT ${nftDetails.tokenId}`}
                className="nftImage"
                onError={(e) => {
                  console.error("Image failed to load:", e);
                  e.target.src = nftDetails.imageUrl;
                }}
              />
            ) : (
              <img 
                src={nftDetails.imageUrl} 
                alt={`NFT ${nftDetails.tokenId}`} 
                className="nftImage" 
              />
            )}
          </div>
          
          <div className="nftDetails">
            <h3 className="nftTitle">NFT #{nftDetails.tokenId}</h3>
            <p className="nftInfo">Original purchase: {nftDetails.price} ETH</p>
            <div className="redemptionSteps">
              <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                <div className="stepNumber">1</div>
                <div className="stepLabel">Size</div>
              </div>
              <div className="stepConnector"></div>
              <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                <div className="stepNumber">2</div>
                <div className="stepLabel">Shipping</div>
              </div>
              <div className="stepConnector"></div>
              <div className={`step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
                <div className="stepNumber">3</div>
                <div className="stepLabel">Payment</div>
              </div>
              <div className="stepConnector"></div>
              <div className={`step ${step >= 4 ? 'active' : ''}`}>
                <div className="stepNumber">4</div>
                <div className="stepLabel">Confirm</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="formSection">
          {step === 1 && renderSizeSelection()}
          {step === 2 && renderShippingInfo()}
          {step === 3 && renderPayment()}
          {step === 4 && renderConfirmation()}
        </div>
      </div>
    </div>
  );
}

export default PhysicalDelivery;