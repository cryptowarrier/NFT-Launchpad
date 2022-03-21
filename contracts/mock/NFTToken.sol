//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract NFTToken is ERC721, Ownable {

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    mapping(address => bool) private _auth;

    modifier auth {
        require(_auth[msg.sender] || msg.sender == owner(), "no permission");
        _;
    }

    constructor() ERC721("TEST NFT", "TEST NFT") {
        // _setBaseURI("https://nft.escrow.com/");
    }

    // function setBaseURI(string memory _uri) public onlyOwner {
    //     _setBaseURI(_uri);
    // }

    function addAuth(address _addr) public onlyOwner {
        _auth[_addr] = true;
    }

    function removeAuth(address _addr) public onlyOwner {
        _auth[_addr] = false;
    }

    function authOf(address _addr) public view returns (bool) {
        return _auth[_addr];
    }

    function mint(address _to) public {
        _tokenIds.increment();
        _mint(_to, _tokenIds.current());
    }


    function burn(uint256 _tokenId) public auth {
        _burn(_tokenId);
    }
}