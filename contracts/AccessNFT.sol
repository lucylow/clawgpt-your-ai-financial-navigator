// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title AccessNFT
 * @dev ERC721 token representing access rights to private AI files
 */
contract AccessNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    mapping(uint256 => string) public fileTypes;
    mapping(uint256 => uint256) public expirationTimestamps;

    event NFTCreated(address indexed to, uint256 indexed tokenId, string fileType, string tokenURI);
    event NFTExpirationUpdated(uint256 indexed tokenId, uint256 expiration);

    constructor() ERC721("ClawGPT Access Token", "CLAW") Ownable(msg.sender) {}

    function mint(
        address to,
        string calldata tokenURI,
        string calldata fileType,
        uint256 expiration
    ) external onlyOwner returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        fileTypes[newTokenId] = fileType;
        expirationTimestamps[newTokenId] = expiration;

        emit NFTCreated(to, newTokenId, fileType, tokenURI);
        return newTokenId;
    }

    function batchMint(
        address[] calldata recipients,
        string[] calldata tokenURIs,
        string[] calldata _fileTypes,
        uint256[] calldata expirations
    ) external onlyOwner returns (uint256[] memory) {
        require(recipients.length == tokenURIs.length, "Length mismatch");
        require(recipients.length == _fileTypes.length, "Length mismatch");
        require(recipients.length == expirations.length, "Length mismatch");

        uint256[] memory tokenIds = new uint256[](recipients.length);

        for (uint256 i = 0; i < recipients.length; i++) {
            _tokenIds.increment();
            uint256 newTokenId = _tokenIds.current();
            _safeMint(recipients[i], newTokenId);
            _setTokenURI(newTokenId, tokenURIs[i]);
            fileTypes[newTokenId] = _fileTypes[i];
            expirationTimestamps[newTokenId] = expirations[i];
            emit NFTCreated(recipients[i], newTokenId, _fileTypes[i], tokenURIs[i]);
            tokenIds[i] = newTokenId;
        }

        return tokenIds;
    }

    function isValid(uint256 tokenId) external view returns (bool) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        uint256 expiration = expirationTimestamps[tokenId];
        return expiration == 0 || block.timestamp < expiration;
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
        uint256 totalSupply = _tokenIds.current();

        for (uint256 i = 1; i <= totalSupply; i++) {
            if (_ownerOf(i) == owner) {
                tokens[index] = i;
                index++;
            }
        }

        return tokens;
    }
}
