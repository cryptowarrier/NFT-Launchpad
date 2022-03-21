//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./INFT.sol";

contract ScoreOracle is Ownable {
  using SafeMath for uint256;
  mapping(address => uint256) scores;
  address public updater;
  IERC20 public token;
  INFT public nft;
  uint256 public balanceDenominator = 1000;

  constructor (address _updater, address _token, address _nft) {
    updater = _updater;
    token = IERC20(_token);
    nft = INFT(_nft);
  }

  function setUpdater(address _updater) public onlyOwner{
    updater = _updater;
  }

  function setBalanceDenominator (uint256 _denominator) public onlyOwner {
    balanceDenominator = _denominator;
  }

  function updateScore(address account, uint256 _score) public {
    require(msg.sender == updater, "Not Updater");
    scores[account] = _score;
  }

  function requestScore(address account) external view returns (uint256) {
    uint256 score = token.balanceOf(account) * balanceDenominator / token.totalSupply() * (1 + scores[account]) *(1 + nft.balanceOf(account)); 
    return score;
  }
}