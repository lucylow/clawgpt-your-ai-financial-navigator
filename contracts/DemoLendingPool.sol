// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DemoLendingPool
 * @dev Minimal USDT-style pool: deposits, simple time-based yield, owner-mediated loans with repayment.
 *      Yield is not sourced from real revenue; fund the contract with stablecoins for demos.
 *      Uses SafeERC20 for tokens that do not return bool on transfer (e.g. some USDT deployments).
 */
contract DemoLendingPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable asset;

    struct Deposit {
        uint256 amount;
        uint256 timestamp;
        uint256 yieldAccrued;
    }

    mapping(address => Deposit) public deposits;
    /// @notice Outstanding principal owed by each borrower (owner-issued loans).
    mapping(address => uint256) public borrowerDebt;

    uint256 public totalLiquidity;
    /// @notice Sum of outstanding loan principals (must be <= deposited liquidity notionally).
    uint256 public totalOutstandingLoans;

    uint256 public baseYieldRate = 500; // 5% APY in basis points (simplified linear accrual)

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount, uint256 yield_);
    event LoanIssued(address indexed borrower, uint256 amount, uint256 term);
    event LoanRepaid(address indexed borrower, uint256 amount);

    constructor(address asset_) Ownable(msg.sender) {
        asset = IERC20(asset_);
    }

    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        asset.safeTransferFrom(msg.sender, address(this), amount);

        Deposit storage userDeposit = deposits[msg.sender];

        if (userDeposit.amount > 0) {
            uint256 yieldEarned = calculateYield(userDeposit);
            userDeposit.yieldAccrued += yieldEarned;
        }

        userDeposit.amount += amount;
        userDeposit.timestamp = block.timestamp;
        totalLiquidity += amount;

        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        Deposit storage userDeposit = deposits[msg.sender];
        require(userDeposit.amount >= amount, "Insufficient balance");

        uint256 yieldEarned = calculateYield(userDeposit);
        uint256 totalYield = userDeposit.yieldAccrued + yieldEarned;

        userDeposit.amount -= amount;
        userDeposit.timestamp = block.timestamp;
        userDeposit.yieldAccrued = 0;
        totalLiquidity -= amount;

        uint256 totalToTransfer = amount + totalYield;
        asset.safeTransfer(msg.sender, totalToTransfer);

        emit Withdrawn(msg.sender, amount, totalYield);
    }

    function calculateYield(Deposit storage userDeposit) internal view returns (uint256) {
        uint256 timeHeld = block.timestamp - userDeposit.timestamp;
        return (userDeposit.amount * baseYieldRate * timeHeld) / (365 days * 10000);
    }

    /// @notice Owner pulls liquidity for an undercollateralized demo loan; borrower must later repay.
    function issueLoan(address borrower, uint256 amount, uint256 term) external onlyOwner nonReentrant {
        require(borrower != address(0), "Invalid borrower");
        require(amount > 0, "Amount must be > 0");
        require(amount <= totalLiquidity, "Insufficient liquidity");

        asset.safeTransfer(borrower, amount);
        totalLiquidity -= amount;
        borrowerDebt[borrower] += amount;
        totalOutstandingLoans += amount;

        emit LoanIssued(borrower, amount, term);
    }

    /// @notice Repay outstanding demo loan principal back into the pool.
    function repayLoan(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(borrowerDebt[msg.sender] >= amount, "Repayment exceeds debt");

        asset.safeTransferFrom(msg.sender, address(this), amount);
        borrowerDebt[msg.sender] -= amount;
        totalOutstandingLoans -= amount;
        totalLiquidity += amount;

        emit LoanRepaid(msg.sender, amount);
    }

    function setYieldRate(uint256 newRate) external onlyOwner {
        require(newRate <= 2000, "Rate too high");
        baseYieldRate = newRate;
    }
}
