import { useState, useCallback } from "react";
import { ethers } from "ethers";
import NFTMarketplace from "../NFTMarketplace.json";

const CONTRACT_ADDRESS = "0x0E55495eBb7b1115F65493Fbd07276dcF856cf20";

export function useNFTs({ type, walletAddress = "" }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNFTs = useCallback(async () => {
    setLoading(true);
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, NFTMarketplace.abi, provider);
      const count = await contract.listingCount();

      let items = [];
      for (let i = 0; i < count; i++) {
        const listing = await contract.listings(i);
        const isOwned = type === "owned" && listing.buyer.toLowerCase() === walletAddress.toLowerCase() && listing.sold;
        const isListing = type === "listings" && !listing.sold;
        if (isOwned || isListing) {
          items.push({
            id: i,
            tokenId: listing.tokenId.toString(),
            price: ethers.utils.formatEther(listing.price),
            imageUrl: listing.imageURL,
            seller: listing.seller.toLowerCase(),
            buyer: listing.buyer.toLowerCase(),
            sold: listing.sold,
          });
        }
      }
      setListings(items);
    } catch (error) {
      console.error(`Error loading ${type} NFTs:`, error);
    }
    setLoading(false);
  }, [type, walletAddress]);

  return { listings, loading, loadNFTs };
}