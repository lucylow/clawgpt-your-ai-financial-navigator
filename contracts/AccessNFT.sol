// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/**
 * @title AccessNFT
 * @dev ERC-721 membership gate with role-based minting and metadata updates.
 */
contract AccessNFT is ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant METADATA_ROLE = keccak256("METADATA_ROLE");

    uint256 private _nextTokenId;

    mapping(uint256 => string) public fileTypes;
    mapping(uint256 => uint256) public expirationTimestamps;

    event NFTCreated(address indexed to, uint256 indexed tokenId, string fileType, string tokenURI);
    event NFTExpirationUpdated(uint256 indexed tokenId, uint256 expiration);

    constructor(address admin) ERC721("ClawGPT Access Token", "CLAW") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(METADATA_ROLE, admin);
    }

    function mint(
        address to,
        string calldata tokenURI_,
        string calldata fileType_,
        uint256 expiration
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        unchecked {
            _nextTokenId++;
        }
        uint256 newTokenId = _nextTokenId;

        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI_);

        fileTypes[newTokenId] = fileType_;
        expirationTimestamps[newTokenId] = expiration;

        emit NFTCreated(to, newTokenId, fileType_, tokenURI_);
        return newTokenId;
    }

    function batchMint(
        address[] calldata recipients,
        string[] calldata tokenURIs,
        string[] calldata fileTypes_,
        uint256[] calldata expirations
    ) external onlyRole(MINTER_ROLE) returns (uint256[] memory) {
        require(
            recipients.length == tokenURIs.length &&
                recipients.length == fileTypes_.length &&
                recipients.length == expirations.length,
            "Length mismatch"
        );

        uint256[] memory tokenIds = new uint256[](recipients.length);

        for (uint256 i = 0; i < recipients.length; i++) {
            unchecked {
                _nextTokenId++;
            }
            uint256 newTokenId = _nextTokenId;
            _safeMint(recipients[i], newTokenId);
            _setTokenURI(newTokenId, tokenURIs[i]);
            fileTypes[newTokenId] = fileTypes_[i];
            expirationTimestamps[newTokenId] = expirations[i];
            emit NFTCreated(recipients[i], newTokenId, fileTypes_[i], tokenURIs[i]);
            tokenIds[i] = newTokenId;
        }

        return tokenIds;
    }

    function isValid(uint256 tokenId) external view returns (bool) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        uint256 expiration = expirationTimestamps[tokenId];
        return expiration == 0 || block.timestamp < expiration;
    }

    function hasAccess(address account) external view returns (bool) {
        uint256 n = _nextTokenId;
        for (uint256 i = 1; i <= n; i++) {
            if (_ownerOf(i) != account) continue;
            uint256 exp = expirationTimestamps[i];
            if (exp == 0 || block.timestamp < exp) return true;
        }
        return false;
    }

    function setExpiration(uint256 tokenId, uint256 expiration) external onlyRole(METADATA_ROLE) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        expirationTimestamps[tokenId] = expiration;
        emit NFTExpirationUpdated(tokenId, expiration);
    }

    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokens = new uint256[](balance);
        uint256 index = 0;
        uint256 totalMinted = _nextTokenId;

        for (uint256 i = 1; i <= totalMinted; i++) {
            if (_ownerOf(i) == owner) {
                tokens[index] = i;
                index++;
            }
        }

        return tokens;
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControl, ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
