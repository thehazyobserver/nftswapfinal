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
- Drag the `dist/` folder into Netlify, or connect your GitHub repo and set the build command to `npm run build` and publish directory to `dist`.

Replace ABIs

- Replace `src/abis/*.json` with the compiled ABIs from your Solidity build for richer interactions (swap, stake, claim, etc.).

Notes

- The scaffold intentionally keeps interactions read-only (listing pools). Once you provide ABIs and addresses for `SwapPool` and `StonerFeePool` we can add swap/stake UI, reward claiming, and batch operations.
