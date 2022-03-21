//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

interface IScoreOracle {
  function requestScore(address) external view returns (uint256);
}