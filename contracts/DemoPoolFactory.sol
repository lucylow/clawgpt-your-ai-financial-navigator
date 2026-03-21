// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DemoLendingPool} from "./DemoLendingPool.sol";

/**
 * @title DemoPoolFactory
 * @dev Deploys {DemoLendingPool} instances with indexed lifecycle events for explorers and off-chain indexers.
 */
contract DemoPoolFactory {
    uint256 public poolCount;
    mapping(uint256 => address) public poolsByIndex;
    mapping(address => bool) public isPool;

    event PoolCreated(
        uint256 indexed poolIndex,
        address indexed pool,
        address indexed asset,
        address admin
    );

    function createPool(address asset, address admin) external returns (address pool) {
        pool = address(new DemoLendingPool(asset, admin));
        uint256 idx = poolCount;
        poolsByIndex[idx] = pool;
        isPool[pool] = true;
        unchecked {
            poolCount = idx + 1;
        }
        emit PoolCreated(idx, pool, asset, admin);
    }
}
