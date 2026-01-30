// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SupplyChainNFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SupplyChainOracle
 * @dev Oracle contract for IoT data integration (optional extension)
 */
contract SupplyChainOracle is Ownable {
    SupplyChainNFT public supplyChainNFT;
    
    mapping(address => bool) public authorizedDevices;
    
    event DeviceAuthorized(address device);
    event DeviceRevoked(address device);
    event DataSubmitted(uint256 indexed tokenId, address device);
    
    constructor(address _nftContract) Ownable(msg.sender) {
        supplyChainNFT = SupplyChainNFT(_nftContract);
    }
    
    function authorizeDevice(address device) external onlyOwner {
        authorizedDevices[device] = true;
        emit DeviceAuthorized(device);
    }
    
    function revokeDevice(address device) external onlyOwner {
        authorizedDevices[device] = false;
        emit DeviceRevoked(device);
    }
    
    function submitData(
        uint256 tokenId,
        int256 temperature,
        uint256 humidity,
        uint256 carbonFootprint,
        string memory historyNote
    ) external {
        require(authorizedDevices[msg.sender], "Device not authorized");
        
        supplyChainNFT.updateBatchData(
            tokenId,
            temperature,
            humidity,
            carbonFootprint,
            historyNote,
            ""
        );
        
        emit DataSubmitted(tokenId, msg.sender);
    }
}
