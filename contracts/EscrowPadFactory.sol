//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EscrowPadFactory is Ownable {
  using EnumerableSet for EnumerableSet.AddressSet;
  struct Milestone {
    uint256 duaration;
    uint256 softcap;
  }

  // events
  event PadRegistered(address padContract);

  EnumerableSet.AddressSet private pads;
  EnumerableSet.AddressSet private councilList;

  function registerPad (address _padAddress) external {
    pads.add(_padAddress);
    emit PadRegistered(_padAddress);
  }

  function padsLength () external view returns (uint256) {
    return pads.length();
  }

  function padAtIndex(uint256 _index) external view returns (address) {
    return pads.at(_index);
  }

  function padIsRegistered(address _padAddress) external view returns (bool) {
    return pads.contains(_padAddress);
  }

  // council

  function vote2Council(address _user, bool _add) public onlyOwner {
    if(_add) {
      councilList.add(_user);
    } else {
      councilList.remove(_user);
    }
  }

  function councilUsersLength () external view returns (uint256) {
    return councilList.length();
  }

  function councilUserAtIndex (uint256 _index) external view returns (address) {
    return councilList.at(_index);
  }

  function userCouncilStatus (address _user) external view returns (bool) {
    return councilList.contains(_user);
  }
}