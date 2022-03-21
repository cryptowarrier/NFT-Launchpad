//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

interface IEscrowPadFactory {
  function registerPad (address _launchpadAddress) external;
  function padIsRegistered(address _launchpadAddress) external view returns (bool);
  function padsLength() external view returns (uint256);

  function councilUsersLength() external view returns (uint256);
  function councilUserAtIndex(uint256) external view returns (address);
  function userCouncilStatus(address) external view returns (bool);
}