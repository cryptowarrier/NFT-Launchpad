//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract NativeToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("Native Token", "NAV") {
        _mint(msg.sender, initialSupply);
    }
}