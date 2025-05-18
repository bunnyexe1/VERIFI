import { useState, useCallback } from "react";
import Web3Modal from "web3modal";
import { ethers } from "ethers";

export function useWallet() {
  const [walletAddress, setWalletAddress] = useState("");

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

  return { walletAddress, connectWallet };
}