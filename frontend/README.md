# NFT Swap & Staking Platform (Frontend)

A professional React application for swapping and staking NFTs, built with Vite and Tailwind CSS.

## Features

### Core Functionality
- **Separated Interfaces**: Dedicated swap and staking interfaces for better UX
- **NFT Swapping**: Swap your NFTs for others in the pool with intuitive interface  
- **NFT Staking**: Stake NFTs to earn rewards with approval handling
- **Pool Management**: Browse and interact with multiple swap/staking pools
- **Rewards System**: Claim accumulated staking rewards

### Technical Features  
- MetaMask wallet integration with Sonic Network support
- Responsive design with Tailwind CSS and custom animations
- Optimized production builds with code splitting
- Real-time NFT loading with skeleton states
- Professional UI with enhanced visual feedback

Quick start

1. Install dependencies

```powershell
cd frontend; npm install
```

2. Copy environment variables

```powershell
cp .env.example .env
# then edit .env to set VITE_FACTORY_ADDRESS and VITE_RPC_URL
```

3. Run dev server

```powershell
npm run dev
```

Build & Deploy to Netlify

- Build: `npm run build`
- Quick deploy: Drag the `dist/` folder into Netlify's site deploy area.
- CI deploy: Connect your GitHub repository to Netlify and set the build command to `npm run build` and the publish directory to `dist`.

Environment variables on Netlify

- Create the following environment variables in Netlify Site Settings > Build & deploy > Environment > Environment variables:
	- `VITE_RPC_URL` — Sonic RPC URL (optional if users will connect wallets)
	- `VITE_FACTORY_ADDRESS` — The `MultiPoolFactoryNonProxy` address used by the UI
	- `VITE_EXPLORER_BASE` — (optional) Explorer base URL, defaults to `https://sonicscan.org`

## Smart Contract Integration

The application includes pre-configured ABIs for all contract interactions:

- `MultiPoolFactoryNonProxy.json` - Factory contract for pool management
- `SwapPool.json` - Core swap pool functionality  
- `StonerFeePool.json` - Staking and rewards system
- `StakeReceipt.json` - Staking receipt tokens
- `StonerNFT.json` - NFT collection interface

### Updating ABIs

To update with your deployed contracts:

1. Build your contracts: `npx hardhat compile`
2. Copy ABIs: `cp artifacts/contracts/YourContract.sol/YourContract.json frontend/src/abis/`
3. Update contract addresses in `.env`

## Production Deployment

The application is production-ready with:

- ✅ Optimized Vite build configuration
- ✅ Code splitting for vendor libraries  
- ✅ Minified assets without source maps
- ✅ Professional UI without development tools
- ✅ Enhanced error handling and loading states

### Build Commands

- `npm run build` - Production build
- `npm run preview` - Preview production build locally
- `npm run build:analyze` - Build with bundle analyzer
2. Replace the placeholder JSON files and ensure exported ABI is an array of function/event definitions (not the full artifact object).

Next Steps / Extending the UI

- With full ABIs and contract addresses we can implement:
	- Swap UI (single and batch)
	- Stake/unstake using the `StakeReceipt` contract
	- Claim rewards (native + ERC20) with the `StonerFeePool` ABI
	- Pagination and token image rendering (using tokenURI)

If you want, provide the compiled ABIs or allow me to extract them from your build folder and I'll wire the swap/stake UI.

Notes

- The scaffold intentionally keeps interactions read-only (listing pools). Once you provide ABIs and addresses for `SwapPool` and `StonerFeePool` we can add swap/stake UI, reward claiming, and batch operations.
