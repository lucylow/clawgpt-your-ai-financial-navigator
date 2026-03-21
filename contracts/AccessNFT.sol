// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AccessNFT
 * @dev ERC-721 membership / gate: metadata URI + optional expiry per token.
 *      Intended as an extensible hook for gated product features (cockpit, agent tools, etc.).
 *      Replace deprecated Counters with a simple counter (OpenZeppelin v5+).
 */
contract AccessNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    mapping(uint256 => string) public fileTypes;
    mapping(uint256 => uint256) public expirationTimestamps;

    event NFTCreated(address indexed to, uint256 indexed tokenId, string fileType, string tokenURI);
    event NFTExpirationUpdated(uint256 indexed tokenId, uint256 expiration);

    constructor() ERC721("ClawGPT Access Token", "CLAW") Ownable(msg.sender) {}

    function mint(
        address to,
        string calldata tokenURI_,
        string calldata fileType_,
        uint256 expiration
    ) external onlyOwner returns (uint256) {
        _nextTokenId++;
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
    ) external onlyOwner returns (uint256[] memory) {
        require(
            recipients.length == tokenURIs.length &&
                recipients.length == fileTypes_.length &&
                recipients.length == expirations.length,
            "Length mismatch"
        );

        uint256[] memory tokenIds = new uint256[](recipients.length);

        for (uint256 i = 0; i < recipients.length; i++) {
            _nextTokenId++;
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

    /// @notice Whether the token exists and is not past its expiry (0 = no expiry).
    function isValid(uint256 tokenId) external view returns (bool) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        uint256 expiration = expirationTimestamps[tokenId];
        return expiration == 0 || block.timestamp < expiration;
    }

    /// @notice True if `account` holds at least one non-expired token (O(supply) scan; fine for demos).
    function hasAccess(address account) external view returns (bool) {
        uint256 n = _nextTokenId;
        for (uint256 i = 1; i <= n; i++) {
            if (_ownerOf(i) != account) continue;
            uint256 exp = expirationTimestamps[i];
            if (exp == 0 || block.timestamp < exp) return true;
        }
        return false;
    }

    function setExpiration(uint256 tokenId, uint256 expiration) external onlyOwner {
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
}
