// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SupplyChainNFT
 * @notice ERC-721 NFT for tracking cocoa batches with EUDR compliance support
 * @dev Includes geolocation hash storage for EU Deforestation Regulation compliance
 */
contract SupplyChainNFT is ERC721, ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    uint256 private _nextTokenId;

    struct BatchData {
        string origin;
        uint256 timestamp;
        string supplierId;
        uint256 carbonFootprint;     // In grams
        int256 temperature;          // In Celsius * 10
        uint256 humidity;            // In percentage * 10
        bool complianceStatus;
        string currentHolder;
        bytes32 geolocationHash;     // keccak256 hash of GeoJSON FeatureCollection (EUDR)
    }

    mapping(uint256 => BatchData) public batches;
    mapping(uint256 => string[]) public batchHistory;

    // Events
    event BatchMinted(
        uint256 indexed tokenId, 
        string origin, 
        string supplierId,
        bytes32 geolocationHash
    );
    event BatchDataUpdated(
        uint256 indexed tokenId, 
        int256 temperature, 
        uint256 humidity, 
        uint256 carbonFootprint
    );
    event MetadataUpdated(
        uint256 indexed tokenId, 
        string newUri,
        bytes32 geolocationHash
    );
    event CustodyTransferred(uint256 indexed tokenId, string nextHolder);
    event GeolocationUpdated(uint256 indexed tokenId, bytes32 newGeolocationHash);

    constructor() ERC721("SustainableCocoa", "COCOA") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
    }

    /**
     * @notice Mint a new batch NFT with EUDR geolocation support
     * @param to Recipient address
     * @param uri IPFS URI for metadata
     * @param origin Origin location string
     * @param supplierId Supplier identifier
     * @param carbonFootprint Initial carbon footprint in grams
     * @param geolocationHash keccak256 hash of GeoJSON FeatureCollection
     */
    function mintBatch(
        address to,
        string memory uri,
        string memory origin,
        string memory supplierId,
        uint256 carbonFootprint,
        bytes32 geolocationHash
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
            currentHolder: "Supplier",
            geolocationHash: geolocationHash
        });

        batchHistory[tokenId].push("Minted at Origin with EUDR geolocation");
        emit BatchMinted(tokenId, origin, supplierId, geolocationHash);
        return tokenId;
    }

    /**
     * @notice Legacy mint function for backward compatibility (no geolocation)
     */
    function mintBatchLegacy(
        address to,
        string memory uri,
        string memory origin,
        string memory supplierId,
        uint256 carbonFootprint
    ) public onlyRole(MINTER_ROLE) returns (uint256) {
        return mintBatch(to, uri, origin, supplierId, carbonFootprint, bytes32(0));
    }

    /**
     * @notice Update batch sensor data
     */
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
            emit MetadataUpdated(tokenId, newUri, batches[tokenId].geolocationHash);
        }

        emit BatchDataUpdated(tokenId, temperature, humidity, carbonFootprint);
    }

    /**
     * @notice Update geolocation hash (for EUDR compliance updates)
     */
    function updateGeolocation(
        uint256 tokenId,
        bytes32 newGeolocationHash,
        string memory newUri
    ) public onlyRole(ORACLE_ROLE) {
        require(_ownerOf(tokenId) != address(0), "Batch does not exist");
        
        batches[tokenId].geolocationHash = newGeolocationHash;
        batchHistory[tokenId].push("Geolocation updated");
        
        if (bytes(newUri).length > 0) {
            _setTokenURI(tokenId, newUri);
        }

        emit GeolocationUpdated(tokenId, newGeolocationHash);
        emit MetadataUpdated(tokenId, newUri, newGeolocationHash);
    }

    /**
     * @notice Transfer custody of batch
     */
    function transferCustody(
        uint256 tokenId, 
        string memory nextHolder, 
        string memory historyNote
    ) public {
        require(ownerOf(tokenId) == msg.sender, "Caller is not owner");
        batches[tokenId].currentHolder = nextHolder;
        batchHistory[tokenId].push(historyNote);
        emit CustodyTransferred(tokenId, nextHolder);
    }

    /**
     * @notice Get batch history
     */
    function getBatchHistory(uint256 tokenId) public view returns (string[] memory) {
        return batchHistory[tokenId];
    }

    /**
     * @notice Check carbon compliance
     */
    function checkCompliance(uint256 tokenId, uint256 maxCarbon) public view returns (bool) {
        return batches[tokenId].carbonFootprint <= maxCarbon;
    }

    /**
     * @notice Get geolocation hash for a batch
     */
    function getGeolocationHash(uint256 tokenId) public view returns (bytes32) {
        return batches[tokenId].geolocationHash;
    }

    /**
     * @notice Check if batch has EUDR geolocation
     */
    function hasGeolocation(uint256 tokenId) public view returns (bool) {
        return batches[tokenId].geolocationHash != bytes32(0);
    }

    // Overrides required by Solidity

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
