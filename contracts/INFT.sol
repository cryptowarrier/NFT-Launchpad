//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

interface INFT {
  function mint(address _to) external;
  function balanceOf(address owner) external view returns (uint256 balance);
}