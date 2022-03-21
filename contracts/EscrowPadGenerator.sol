//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;


import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IEscrowPadFactory.sol";
import "./EscrowPad.sol";

contract EscrowPadGenerator is Ownable {
  using SafeMath for uint256;

  struct Milestone {
    uint256 startBlock;
    uint256 duration;
    uint256 softcap;
    uint256 rate;
    uint256 nftPrice;
  }

  address public devAddr;
  address public baseToken;
  address public oracle;

  IEscrowPadFactory public factory;

  constructor(
    IEscrowPadFactory _factory,
    address _devAddress,
    address _baseToken,
    address _oracle
  ) {
    factory = _factory;
    devAddr = _devAddress;
    baseToken = _baseToken;
    oracle = _oracle;
  }

  function createPad (
    address _token,
    address _NFTToken,
    uint256[5] memory uint_params
  ) public {

    Milestone memory params;
    params.startBlock = uint_params[0];
    params.duration = uint_params[1];
    params.softcap = uint_params[2];
    params.rate = uint_params[3];
    params.nftPrice = uint_params[4];

    require(params.startBlock > block.timestamp, 'Invalid start time');
    require(params.duration >= 14 days, 'Short market duration');
    require(params.softcap > 0, 'Softcap must not be zero');
    require(params.rate > 0 , 'Invalid param');

    EscrowPad newPad = new EscrowPad(
      address(this),
      _token,
      baseToken,
      devAddr,
      oracle,
      _NFTToken,
      factory
    );

    uint256 tokensRequired = params.softcap * params.rate * 2;
    IERC20(_token).transferFrom(address(msg.sender), address(newPad), tokensRequired);

    require(IERC20(_token).balanceOf(address(newPad)) == tokensRequired, 'Transfer Failed!');
    
    uint256 padId = factory.padsLength();
    factory.registerPad(address(newPad));
    newPad.initPad(
      padId,
      msg.sender,
      params.startBlock,
      params.duration,
      params.softcap,
      params.rate,
      params.nftPrice
    );
  }

}