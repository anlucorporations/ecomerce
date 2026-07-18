import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const EUROTOKEN_ABI = [
  "function mint(address to, uint256 amount) external",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function owner() view returns (address)"
];

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, amount } = await request.json();

    if (!walletAddress || !amount) {
      return NextResponse.json(
        { error: 'Wallet address and amount are required' },
        { status: 400 }
      );
    }

    // Get RPC URL from environment variables, default to localhost for backwards compatibility
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';
    
    if (!process.env.OWNER_PRIVATE_KEY) {
      console.error('OWNER_PRIVATE_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error: OWNER_PRIVATE_KEY not set' },
        { status: 500 }
      );
    }

    // Connect to blockchain
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const signer = new ethers.Wallet(
      process.env.OWNER_PRIVATE_KEY,
      provider
    );

    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_EUROTOKEN_CONTRACT_ADDRESS!,
      EUROTOKEN_ABI,
      signer
    );

    // Verify that the signer address matches the contract owner
    const signerAddress = await signer.getAddress();
    const contractOwner = await contract.owner();
    
    console.log('Signer address:', signerAddress);
    console.log('Contract owner:', contractOwner);
    console.log('Contract address:', process.env.NEXT_PUBLIC_EUROTOKEN_CONTRACT_ADDRESS);
    console.log('RPC URL:', rpcUrl);

    if (signerAddress.toLowerCase() !== contractOwner.toLowerCase()) {
      return NextResponse.json(
        { 
          error: 'Owner mismatch', 
          details: `Signer address (${signerAddress}) does not match contract owner (${contractOwner}). Please check OWNER_PRIVATE_KEY configuration.`
        },
        { status: 500 }
      );
    }

    // Calculate amount with 6 decimals
    const amountToMint = ethers.parseUnits(amount.toString(), 6);

    // Mint tokens
    const tx = await contract.mint(walletAddress, amountToMint);
    await tx.wait();

    // Get updated balances
    const newBalance = await contract.balanceOf(walletAddress);
    const totalSupply = await contract.totalSupply();

    return NextResponse.json({
      success: true,
      transactionHash: tx.hash,
      amountMinted: amount,
      walletAddress,
      newBalance: ethers.formatUnits(newBalance, 6),
      totalSupply: ethers.formatUnits(totalSupply, 6)
    });

  } catch (error) {
    console.error('Error minting tokens:', error);
    
    // Provide more detailed error messages
    let errorMessage = 'Failed to mint tokens';
    let errorDetails = 'Unknown error';
    
    if (error instanceof Error) {
      errorDetails = error.message;
      
      // Provide user-friendly error messages
      if (error.message.includes('insufficient funds') || error.message.includes('gas')) {
        errorMessage = 'Insufficient funds for gas fees';
      } else if (error.message.includes('nonce')) {
        errorMessage = 'Transaction nonce error. Please try again.';
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        errorMessage = 'Network connection error. Please check your RPC URL configuration.';
      } else if (error.message.includes('revert') || error.message.includes('execution reverted')) {
        errorMessage = 'Transaction failed. You may not have permission to mint tokens.';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage, 
        details: errorDetails,
        rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545'
      },
      { status: 500 }
    );
  }
}