// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract SupplyChainNFT is ERC721, ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    uint256 private _nextTokenId;

    struct BatchData {
        string origin;
        uint256 timestamp;
        string supplierId;
        uint256 carbonFootprint; // In grams
        int256 temperature;      // In Celsius * 10
        uint256 humidity;        // In percentage * 10
        bool complianceStatus;
        string currentHolder;
    }

    mapping(uint256 => BatchData) public batches;
    mapping(uint256 => string[]) public batchHistory;

    event BatchMinted(uint256 indexed tokenId, string origin, string supplierId);
    event BatchDataUpdated(uint256 indexed tokenId, int256 temperature, uint256 humidity, uint256 carbonFootprint);
    event MetadataUpdated(uint256 indexed tokenId, string newUri);
    event CustodyTransferred(uint256 indexed tokenId, string nextHolder);

    constructor() ERC721("SustainableCocoa", "COCOA") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
    }

    function mintBatch(
        address to,
        string memory uri,
        string memory origin,
        string memory supplierId,
        uint256 carbonFootprint
    ) public onlyRole(MINTER_ROLE) returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        batches[tokenId] = BatchData({
            origin: origin,
            timestamp: block.timestamp,
            supplierId: supplierId,
            carbonFootprint: carbonFootprint,
            temperature: 0,
            humidity: 0,
            complianceStatus: true,
            currentHolder: "Supplier"
        });

        batchHistory[tokenId].push("Minted at Origin");
        emit BatchMinted(tokenId, origin, supplierId);
        return tokenId;
    }

    function updateBatchData(
        uint256 tokenId,
        int256 temperature,
        uint256 humidity,
        uint256 carbonFootprint,
        string memory historyNote,
        string memory newUri
    ) public onlyRole(ORACLE_ROLE) {
        require(_ownerOf(tokenId) != address(0), "Batch does not exist");
        
        batches[tokenId].temperature = temperature;
        batches[tokenId].humidity = humidity;
        batches[tokenId].carbonFootprint += carbonFootprint;
        
        if (bytes(historyNote).length > 0) {
            batchHistory[tokenId].push(historyNote);
        }

        if (bytes(newUri).length > 0) {
            _setTokenURI(tokenId, newUri);
            emit MetadataUpdated(tokenId, newUri);
        }

        emit BatchDataUpdated(tokenId, temperature, humidity, carbonFootprint);
    }

    function transferCustody(uint256 tokenId, string memory nextHolder, string memory historyNote) public {
        require(ownerOf(tokenId) == msg.sender, "Caller is not owner");
        batches[tokenId].currentHolder = nextHolder;
        batchHistory[tokenId].push(historyNote);
        emit CustodyTransferred(tokenId, nextHolder);
    }

    function getBatchHistory(uint256 tokenId) public view returns (string[] memory) {
        return batchHistory[tokenId];
    }

    function checkCompliance(uint256 tokenId, uint256 maxCarbon) public view returns (bool) {
        return batches[tokenId].carbonFootprint <= maxCarbon;
    }

    // Overrides required by Solidity.

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
