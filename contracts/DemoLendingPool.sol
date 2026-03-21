// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DemoLendingPool
 * @dev Role-based demo pool: deposits, linear yield, operator-issued loans with repayment.
 *      Emits rich lifecycle events for indexers. Pausing blocks user deposits/withdrawals; repay stays open.
 */
contract DemoLendingPool is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant POOL_MANAGER_ROLE = keccak256("POOL_MANAGER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    IERC20 public immutable asset;

    struct Deposit {
        uint256 amount;
        uint256 timestamp;
        uint256 yieldAccrued;
    }

    mapping(address => Deposit) public deposits;
    mapping(address => uint256) public borrowerDebt;

    uint256 public totalLiquidity;
    uint256 public totalOutstandingLoans;
    uint256 public baseYieldRate = 500; // 5% APY in basis points (simplified linear accrual)
    uint256 public loanNonce;

    event PoolBootstrapped(address indexed asset_, address indexed admin);
    event Deposited(address indexed user, uint256 amount, uint256 totalLiquidityAfter);
    event Withdrawn(address indexed user, uint256 principal, uint256 yield_, uint256 totalLiquidityAfter);
    event YieldRateUpdated(uint256 previousRate, uint256 newRate, address indexed updatedBy);
    event LoanIssued(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount,
        uint256 term,
        uint256 totalOutstandingAfter,
        uint256 liquidityAfter
    );
    event LoanRepaid(
        address indexed borrower,
        uint256 amount,
        uint256 remainingDebt,
        uint256 totalLiquidityAfter
    );
    event LiquiditySnapshot(uint256 totalLiquidity, uint256 totalOutstandingLoans);

    constructor(address asset_, address admin) {
        require(asset_ != address(0) && admin != address(0), "Zero address");
        asset = IERC20(asset_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(POOL_MANAGER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        emit PoolBootstrapped(asset_, admin);
        emit LiquiditySnapshot(0, 0);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function deposit(uint256 amount) external nonReentrant whenNotPaused {
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

        emit Deposited(msg.sender, amount, totalLiquidity);
        emit LiquiditySnapshot(totalLiquidity, totalOutstandingLoans);
    }

    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
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

        emit Withdrawn(msg.sender, amount, totalYield, totalLiquidity);
        emit LiquiditySnapshot(totalLiquidity, totalOutstandingLoans);
    }

    function calculateYield(Deposit storage userDeposit) internal view returns (uint256) {
        uint256 timeHeld = block.timestamp - userDeposit.timestamp;
        return (userDeposit.amount * baseYieldRate * timeHeld) / (365 days * 10000);
    }

    function issueLoan(address borrower, uint256 amount, uint256 term) external onlyRole(POOL_MANAGER_ROLE) nonReentrant {
        require(borrower != address(0), "Invalid borrower");
        require(amount > 0, "Amount must be > 0");
        require(amount <= totalLiquidity, "Insufficient liquidity");

        unchecked {
            loanNonce++;
        }
        uint256 loanId = loanNonce;

        asset.safeTransfer(borrower, amount);
        totalLiquidity -= amount;
        borrowerDebt[borrower] += amount;
        totalOutstandingLoans += amount;

        emit LoanIssued(loanId, borrower, amount, term, totalOutstandingLoans, totalLiquidity);
        emit LiquiditySnapshot(totalLiquidity, totalOutstandingLoans);
    }

    function repayLoan(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(borrowerDebt[msg.sender] >= amount, "Repayment exceeds debt");

        asset.safeTransferFrom(msg.sender, address(this), amount);
        borrowerDebt[msg.sender] -= amount;
        totalOutstandingLoans -= amount;
        totalLiquidity += amount;

        emit LoanRepaid(msg.sender, amount, borrowerDebt[msg.sender], totalLiquidity);
        emit LiquiditySnapshot(totalLiquidity, totalOutstandingLoans);
    }

    function setYieldRate(uint256 newRate) external onlyRole(POOL_MANAGER_ROLE) {
        require(newRate <= 2000, "Rate too high");
        uint256 prev = baseYieldRate;
        baseYieldRate = newRate;
        emit YieldRateUpdated(prev, newRate, msg.sender);
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
