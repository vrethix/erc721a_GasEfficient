// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./ERC721A.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./AccessProtected.sol";

contract MyToken is Ownable, ERC721A, ReentrancyGuard, AccessProtected {
  using Address for address;
    uint256 public fee = 10**4;
    uint256 startSale;
    mapping(address => bool) public whitelisted;
    
    bool saleEnabled;

    mapping(address => uint256) nftCounter;

    event enabled(bool saleEnabled);
    

  constructor(
    uint256 maxBatchSize_,
    uint256 collectionSize_
  
  ) ERC721A("My Token", "MT", maxBatchSize_, collectionSize_) {
    // maxMint = maxBatchSize_;
  }
    function enableSale() external onlyOwner {
        require(!saleEnabled, "Sale is already enabled");
        startSale = block.timestamp;
        saleEnabled = true;
        emit enabled(saleEnabled);
    }

    /**
     * Add contract addresses to the whitelist
     */

    function addToWhitelist(address _user) public onlyOwner {
        require(!whitelisted[_user], "already whitelisted");
        whitelisted[_user] = true;
    } 

    function addAddressesToWhitelist(address[] memory _userAddresses) public onlyOwner {
        for(uint256 i = 0; i < _userAddresses.length; i++){
            addToWhitelist(_userAddresses[i]);
        }
    }
    
    function checkWhitelist(address _user) public view returns(bool)  {
        return whitelisted[_user];
    }
    
    /**
     * Remove a contract addresses from the whitelist
     */

    function removeFromWhitelist(address _user) public onlyOwner {
        require(whitelisted[_user], "user not in whitelist");
        whitelisted[_user] = false;
    }

    function batchRemoveFromWhitelist(address[] memory _userAddresses) public onlyOwner {
        for(uint256 i = 0; i < _userAddresses.length; i++){
            removeFromWhitelist(_userAddresses[i]);
        }
    }

    function teamMint(uint quantity) public onlyOwner {
        require(totalSupply() + quantity <= collectionSize, "reached max supply");
        require(
            nftCounter[msg.sender] +quantity <= 200,
            "More than 200 NFTs cannot be minted"
        );
        nftCounter[msg.sender]+= quantity;
        _safeMint(msg.sender, quantity);
    
    }

    function mint(uint quantity) public
        payable {
        require(saleEnabled, "Sale isn't started yet");
        require(msg.value >= fee * quantity, "amount not Sufficient to mint");
        require(totalSupply() + quantity <= collectionSize, "reached max supply");
        if (startSale < block.timestamp && startSale + 86400 > block.timestamp) {
          require(whitelisted[msg.sender], "not eligible for whiteList mint");
        }
        _safeMint(msg.sender, quantity);
    }

    function cfee(uint256 numb) public view returns (uint256) {
        return numb * fee;
    }

    function setFee(uint256 _newfee) external onlyOwner {
        fee = _newfee;
    }

   

  // // metadata URI
  string private _baseTokenURI;

  function _baseURI() internal view virtual override returns (string memory) {
    return _baseTokenURI;
  }

  function setBaseURI(string calldata baseURI) external onlyOwner {
    _baseTokenURI = baseURI;
  }

  function withdrawMoney() external onlyOwner nonReentrant {
    (bool success, ) = msg.sender.call{value: address(this).balance}("");
    require(success, "Transfer failed.");
  }

  function setOwnersExplicit(uint256 quantity) external onlyOwner nonReentrant {
    _setOwnersExplicit(quantity);
  }

  function numberMinted(address owner) public view returns (uint256) {
    return _numberMinted(owner);
  }

  function getOwnershipData(uint256 tokenId)
    external
    view
    returns (TokenOwnership memory)
  {
    return ownershipOf(tokenId);
  }
}