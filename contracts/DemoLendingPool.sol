// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title DemoLendingPool
 * @dev Minimal lending pool for hackathon demonstration
 */
contract DemoLendingPool is Ownable, ReentrancyGuard {
    IERC20 public usdt;

    struct Deposit {
        uint256 amount;
        uint256 timestamp;
        uint256 yieldAccrued;
    }

    mapping(address => Deposit) public deposits;
    uint256 public totalLiquidity;
    uint256 public baseYieldRate = 500; // 5% in basis points

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount, uint256 yield_);
    event LoanIssued(address indexed borrower, uint256 amount, uint256 term);

    constructor(address _usdt) {
        usdt = IERC20(_usdt);
    }

    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(usdt.transferFrom(msg.sender, address(this), amount), "Transfer failed");

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
        require(usdt.transfer(msg.sender, totalToTransfer), "Transfer failed");

        emit Withdrawn(msg.sender, amount, totalYield);
    }

    function calculateYield(Deposit storage userDeposit) internal view returns (uint256) {
        uint256 timeHeld = block.timestamp - userDeposit.timestamp;
        return (userDeposit.amount * baseYieldRate * timeHeld) / (365 days * 10000);
    }

    function issueLoan(address borrower, uint256 amount, uint256 term) external onlyOwner {
        require(amount <= totalLiquidity, "Insufficient liquidity");
        require(usdt.transfer(borrower, amount), "Transfer failed");
        totalLiquidity -= amount;
        emit LoanIssued(borrower, amount, term);
    }

    function setYieldRate(uint256 newRate) external onlyOwner {
        require(newRate <= 2000, "Rate too high");
        baseYieldRate = newRate;
    }
}
