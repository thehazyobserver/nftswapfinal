# NFT Swap Dashboard (Frontend)

This is a Vite + React scaffold for interacting with the MultiPoolFactoryNonProxy and SwapPool contracts.

Features:
- Connect wallet via MetaMask
- Load pools from `getAllPools()` and display basic information
- Pool detail modal with links and copy-to-clipboard

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
	- `VITE_EXPLORER_BASE` — (optional) Explorer base URL, defaults to `https://explorer.sonic.org`

Replace ABIs

- For full functionality (swap, stake, claim), replace `src/abis/*.json` with the JSON ABIs produced by your Solidity build (Hardhat/Foundry/Truffle). The scaffold includes a minimal `MultiPoolFactoryNonProxy.json` with the functions needed for listing pools. When you add richer ABIs, update `PoolActions.jsx` to call the appropriate methods on `SwapPool` and `StonerFeePool`.

Adding compiled ABIs from Hardhat

1. Run your build (e.g., `npx hardhat compile`) — copy the artifact `artifacts/contracts/.../*.json` to `frontend/src/abis/`.
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
