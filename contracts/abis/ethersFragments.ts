/**
 * Ethers-style ABI fragments for read/write helpers. Lives under /contracts (not src/)
 * so chain interaction shapes stay separate from presentation code.
 */
export const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
] as const;

export const AAVE_LENDING_POOL_ABI = [
  "function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)",
  "function withdraw(address asset, uint256 amount, address to) returns (uint256)",
  "function getUserAccountData(address user) view returns (uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
] as const;

export const UNISWAP_ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)",
] as const;

/** ClawGPT AccessNFT.sol — gated membership / expiry (AccessControl roles) */
export const ACCESS_NFT_ABI = [
  "function mint(address to, string tokenURI_, string fileType_, uint256 expiration) returns (uint256)",
  "function batchMint(address[] recipients, string[] tokenURIs, string[] fileTypes_, uint256[] expirations) returns (uint256[])",
  "function isValid(uint256 tokenId) view returns (bool)",
  "function hasAccess(address account) view returns (bool)",
  "function setExpiration(uint256 tokenId, uint256 expiration)",
  "function tokensOfOwner(address owner) view returns (uint256[])",
  "function fileTypes(uint256 tokenId) view returns (string)",
  "function expirationTimestamps(uint256 tokenId) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function MINTER_ROLE() view returns (bytes32)",
  "function METADATA_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
] as const;

/** DemoLendingPool.sol — demo deposits, yield, loans (AccessControl + Pausable) */
export const DEMO_LENDING_POOL_ABI = [
  "function asset() view returns (address)",
  "function deposit(uint256 amount)",
  "function withdraw(uint256 amount)",
  "function issueLoan(address borrower, uint256 amount, uint256 term)",
  "function repayLoan(uint256 amount)",
  "function borrowerDebt(address borrower) view returns (uint256)",
  "function deposits(address user) view returns (uint256 amount, uint256 timestamp, uint256 yieldAccrued)",
  "function totalLiquidity() view returns (uint256)",
  "function totalOutstandingLoans() view returns (uint256)",
  "function baseYieldRate() view returns (uint256)",
  "function loanNonce() view returns (uint256)",
  "function setYieldRate(uint256 newRate)",
  "function pause()",
  "function unpause()",
  "function paused() view returns (bool)",
  "function POOL_MANAGER_ROLE() view returns (bytes32)",
  "function PAUSER_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "event PoolBootstrapped(address indexed asset_, address indexed admin)",
  "event LiquiditySnapshot(uint256 totalLiquidity, uint256 totalOutstandingLoans)",
  "event LoanIssued(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 term, uint256 totalOutstandingAfter, uint256 liquidityAfter)",
] as const;

/** DemoClawToken.sol — ERC20Votes governance token */
export const DEMO_CLAW_TOKEN_ABI = [
  "function mint(address to, uint256 amount)",
  "function delegate(address delegatee)",
  "function getVotes(address account) view returns (uint256)",
  "function getPastVotes(address account, uint256 timepoint) view returns (uint256)",
  "function MINTER_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
] as const;

/** DemoGovernor.sol — OpenZeppelin Governor (propose, castVote, execute) */
export const DEMO_GOVERNOR_ABI = [
  "function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) returns (uint256)",
  "function castVote(uint256 proposalId, uint8 support)",
  "function castVoteWithReason(uint256 proposalId, uint8 support, string reason)",
  "function state(uint256 proposalId) view returns (uint8)",
  "function proposalVotes(uint256 proposalId) view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)",
  "function quorum(uint256 timepoint) view returns (uint256)",
  "function votingDelay() view returns (uint256)",
  "function votingPeriod() view returns (uint256)",
] as const;

/** DemoPoolFactory.sol — deploy pools with indexed PoolCreated events */
export const DEMO_POOL_FACTORY_ABI = [
  "function createPool(address asset, address admin) returns (address pool)",
  "function poolCount() view returns (uint256)",
  "function poolsByIndex(uint256 index) view returns (address)",
  "function isPool(address pool) view returns (bool)",
  "event PoolCreated(uint256 indexed poolIndex, address indexed pool, address indexed asset, address admin)",
] as const;
