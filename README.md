Here is a detailed `README.md` for your GitHub repository `lucylow/clawgpt-your-ai-financial-navigator`, crafted based on the project's structure and recent commits. It highlights the project's evolution from a template into a full-fledged AI financial cockpit.

```markdown
# 🦞 ClawGPT: Your AI Financial Navigator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC)](https://tailwindcss.com/)

**ClawGPT** is an AI-powered financial cockpit that lets you manage your multi-chain assets through a conversational interface. It combines a stunning 3D globe visualization with the power of autonomous agents, moving beyond simple chatbots to become your personal on-chain financial navigator.

This project is actively developed for the Tether Hackathon Galactica: WDK Edition 1, integrating Tether's Wallet Development Kit (WDK) for self-custodial operations and the OpenClaw agent framework for intelligent automation.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| **🤖 Conversational AI Agent** | Interact with your portfolio using natural language: *"Send 50 USDt to Mike," "Show me my XAUt balance,"* or *"Find the best yield on Arbitrum."* |
| **🌐 Multi-Chain Support** | Unified management of assets across 6+ chains including Ethereum, Polygon, Arbitrum, Solana, Tron, and TON. |
| **🔐 Self-Custodial Wallet** | Built on **Tether's WDK** – your private keys stay with you, encrypted locally. |
| **📊 3D Interactive Dashboard** | A split-screen UI featuring a live, interactive 3D globe that visualizes your assets across the world, a Bloomberg-style transaction ticker, and dynamic charts. Built with **React Three Fiber**. |
| **🧠 Autonomous Agent Skills** | OpenClaw agent monitors your portfolio, suggests optimizations, and can execute complex, multi-step DeFi strategies with your permission. |
| **📜 Smart Contract Integration** | Includes contracts for NFT-gated access, DAO governance, and lending pools (see `/contracts`). |

## 🛠️ Tech Stack

This project is built with a modern, performant stack:

*   **Core Framework**: [React](https://reactjs.org/) 18, [TypeScript](https://www.typescriptlang.org/) 5, [Vite](https://vitejs.dev/) 6
*   **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/) 3, [shadcn-ui](https://ui.shadcn.com/) components
*   **3D Graphics**: [Three.js](https://threejs.org/) via [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
*   **State Management & Data**: Zustand, React Query, Supabase (for backend services)
*   **Blockchain Integration**: Tether WDK, ethers.js, Solidity (for contracts in `/contracts`)
*   **Testing**: Vitest, Playwright

---

## 🚀 Quick Start Guide

Get the project up and running locally in a few minutes.

### Prerequisites
*   [Node.js](https://nodejs.org/) (version 18+ recommended) and npm (or [bun](https://bun.sh/))
*   Git

### Installation Steps

1.  **Clone the repository**
    ```bash
    git clone https://github.com/lucylow/clawgpt-your-ai-financial-navigator.git
    cd clawgpt-your-ai-financial-navigator
    ```

2.  **Install dependencies**
    Using npm:
    ```bash
    npm install
    ```
    Or using bun (as indicated by `bun.lockb` in the repo):
    ```bash
    bun install
    ```

3.  **Set up environment variables**
    The project uses Supabase and other services. You'll need to create a `.env` file in the root directory. Use the provided `.env` file in the repository as a template, filling in your own API keys and configuration details.

4.  **Start the development server**
    ```bash
    npm run dev
    # or
    bun run dev
    ```
    The application will be available at `http://localhost:5173` (or the next available port).

## 🏗️ Project Structure

Here's an overview of the project's main directories and files:

```
clawgpt-your-ai-financial-navigator/
├── public/                 # Static assets
├── src/                    # Main source code
│   ├── components/         # Reusable React components
│   ├── ...                 # (Other source directories as the project grows)
│   └── ...
├── contracts/              # Solidity smart contracts
│   ├── AccessNFT.sol       # NFT contract for private file access
│   ├── DemoLendingPool.sol # Example lending pool contract
│   └── ...                 # Governance contracts (DAO, Token)
├── supabase/               # Supabase configuration and migrations
├── .env                    # Environment variables (create this)
├── components.json         # shadcn-ui configuration
├── index.html              # Main HTML entry point
├── package.json            # Project dependencies and scripts
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite build tool configuration
```

*Note: The `src` directory is where the main React application logic resides. The `contracts` folder contains the Solidity code for blockchain integrations.*

## 🔗 Smart Contract Integration

The `/contracts` directory contains the on-chain logic that powers advanced features. Recent commits (March 15, 2026) added:
*   **Access & Lending Contracts**: Core logic for the DeFi lending bot track and NFT-gated access.
*   **Governance Contracts**: Enabling DAO creation and on-chain voting, allowing the ClawGPT community to govern the platform's future.

## ☁️ Deployment

This project is designed for easy deployment via [Lovable](https://lovable.dev/projects).

1.  In your Lovable project dashboard, navigate to **Share**.
2.  Click **Publish**.
3.  Your app will be deployed to a public URL.
4.  To connect a custom domain, go to **Project > Settings > Domains**.

You can also build the project for static hosting:
```bash
npm run build
```
The output will be in the `dist` folder, ready to be deployed to services like Netlify, Vercel, or GitHub Pages.

## 🤝 How to Contribute

We welcome contributions! Whether it's fixing a bug, proposing a new feature, or improving the documentation.

1.  **Fork** the repository.
2.  Create a new branch for your feature or fix (`git checkout -b feature/amazing-feature`).
3.  **Commit** your changes (`git commit -m 'Add some amazing feature'`).
4.  **Push** to the branch (`git push origin feature/amazing-feature`).
5.  Open a **Pull Request**.

You can also edit files directly on GitHub or use GitHub Codespaces for a full development environment in the cloud.

## 📄 License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details (you may need to add this file).

## 🙏 Acknowledgements

*   Built with the [Lovable](https://lovable.dev/) platform.
*   Powered by [Tether's WDK](https://wallet.tether.io/) and the [OpenClaw](https://openclaw.ai/) agent framework.
*   UI components from [shadcn-ui](https://ui.shadcn.com/).

---

**Built with 💙 for the Tether Hackathon Galactica: WDK Edition 1**
