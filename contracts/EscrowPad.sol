//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./IScoreOracle.sol";
import "./IEscrowPadFactory.sol";
import "./INFT.sol";

contract EscrowPad is ReentrancyGuard {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  IERC20 public token;
  IERC20 public baseToken;
  IScoreOracle public oracle;
  INFT public nft;
  IEscrowPadFactory public factory;

  struct PadInfo {
    address padOwner;
    uint256 softcap;
    uint256 rate;
    uint256 startBlock;
    uint256 endBlock;
    uint256 nftPrice;
  }

  struct PadStatus {
    bool FORCE_FAILED; // set this flag to force fail the presale
    bool FORCE_SUCCESS; // presale owner can set this flag when TOTAL_BASE_COLLECTED is almost equal to hardcap
    bool DISPUTE;
    bool FINISHED;
    uint256 TOTAL_BASE_COLLECTED; // total base currency raised 
    uint256 TOTAL_TOKENS_SOLD; // total presale tokens sold
    uint256 TOTAL_TOKENS_WITHDRAWN; // total tokens withdrawn post successful presale
    uint256 TOTAL_BASE_WITHDRAWN; // total base tokens withdrawn on presale failure
    uint256 NUM_BUYERS; // number of unique participants
    uint256 COUNCIL_AGREE;
    uint256 COUNCIL_DISAGREE;
    uint256 USER_AGREE;
    uint256 USER_DISAGREE;
    bool SECOND_HOLD;
  }

  struct BuyerInfo {
    uint256 baseDeposited;
    uint256 tokensOwed;
    uint256 nftLevel;
  }

  uint256 public padId;
  address public generator;
  address payable public devAddr;
  address public padOwner;
  uint256 public holdPeriod = 7 days;
  uint256 public disputePeriod = 7 days;

  uint256 public step;
  mapping(uint256 => PadInfo) public padInfo;
  mapping(uint256 => mapping(address => bool)) votedCouncil1;
  mapping(uint256 => mapping(address => bool)) votedCouncil2;
  mapping(uint256 => mapping(address => bool)) votedUser;
  PadStatus public status;
  mapping (address => BuyerInfo) public buyers;

  constructor (
    address _generator,
    address _token,
    address _baseToken,
    address _devAddress,
    address _oracle,
    address _NFTToken,
    IEscrowPadFactory _factory
  ) {
    generator = _generator;
    token = IERC20(_token);
    baseToken = IERC20(_baseToken);
    devAddr = payable(_devAddress);
    oracle = IScoreOracle(_oracle);
    nft = INFT(_NFTToken);
    factory = _factory;
  }

  // modifiers
  modifier onlyGenerator () {
    require(msg.sender == generator, 'Not Generator');
    _;
  }

  modifier onlyPadOwner () {
    require(msg.sender == padOwner, 'Not Pad Owner');
    _;
  }
  // intial functions
  function initPad(
    uint256 _padId,
    address _padOwner,
    uint256 _startBlock,
    uint256 _duration,
    uint256 _softcap,
    uint256 _rate,
    uint256 _nftPrice
  ) external onlyGenerator {
    padId = _padId;
    padOwner = _padOwner;
    step = 0;
    padInfo[step].softcap = _softcap;
    padInfo[step].startBlock = _startBlock;
    padInfo[step].rate = _rate;
    padInfo[step].endBlock = _startBlock + _duration;
    padInfo[step].nftPrice = _nftPrice;
  }

  // Pad Owner functions

  function tokenInByOwner(uint256 _amount) public onlyPadOwner {
    token.transferFrom(msg.sender, address(this), _amount);
  }

  function setPadOwner(address _padOwner) public onlyPadOwner {
    padOwner = _padOwner;
  }

  function ownerWithdrawTokens () external onlyPadOwner {
    require(padStatus() == 3 || status.FINISHED);
    token.transfer(padOwner, token.balanceOf(address(this)));
  }

  function setDispute() external onlyPadOwner {
    require(block.timestamp > padInfo[step].endBlock , 'Still Active!');
    require(padStatus() == 6, 'Can not dispute this time');
    status.DISPUTE = true;
  }

  function addNewMilestone(
    uint256 _softcap,
    uint256 _rate
  ) public onlyPadOwner {
    require(padStatus() == 9, 'Can not add milestone at this time');
       
    step++;
    padInfo[step].startBlock = block.timestamp;
    padInfo[step].endBlock = block.timestamp + 30 days;
    padInfo[step].softcap = _softcap;
    padInfo[step].rate = _rate;
    status.DISPUTE = false;
    status.SECOND_HOLD = false;
    status.USER_AGREE = 0;
    status.USER_DISAGREE = 0;
    status.COUNCIL_AGREE = 0;
    status.COUNCIL_DISAGREE = 0;
  }

  // Dev functions

  function forceSuccessByDev () public {
    require(msg.sender == devAddr, 'Not dev');
    status.FORCE_SUCCESS = true;
    status.DISPUTE = false;
  }

  function forceFailByDev () public {
    require(msg.sender == devAddr, 'Not dev');
    status.FORCE_FAILED = true;
  }

  function setHoldPeriod (uint256 _holdPeriod) public {
    require(msg.sender == devAddr, 'Not dev');
    holdPeriod = _holdPeriod;
  }

  function setDisputePeriod (uint256 _disputePeriod) public {
    require(msg.sender == devAddr, 'Not dev');
    disputePeriod = _disputePeriod;
  }

  function setDisputeByDev () public {
    require(msg.sender == devAddr, 'Not dev');
    require(padStatus() == 6, 'Can not dispute this time');
    status.DISPUTE = true;
  }

  function set2ndHoldByDev () public {
    require(msg.sender == devAddr, 'Not dev');
    require(padStatus() == 7, 'Can not hold again this time');
    status.SECOND_HOLD = true;
    status.COUNCIL_AGREE = 0;
    status.COUNCIL_DISAGREE = 0;
  }

  function setFinishByDev () public {
    require(msg.sender == devAddr, 'Not dev');
    status.FINISHED = true;
  }

  // status function

  function padStatus() public view returns (uint256) {
    if (status.FORCE_FAILED) {
      return 3; // force fail
    }
    if ((block.timestamp > padInfo[step].endBlock) && (status.TOTAL_BASE_COLLECTED < padInfo[step].softcap)) {
      return 3; // failed - softcap not met by end block
    }
    if ((block.timestamp > padInfo[step].endBlock) && (block.timestamp < padInfo[step].endBlock + holdPeriod) && (status.TOTAL_BASE_COLLECTED >= padInfo[step].softcap)) {
      return 4; // hold period
    }
    if (!status.DISPUTE && (block.timestamp > padInfo[step].endBlock + holdPeriod) && (status.COUNCIL_AGREE >= status.COUNCIL_DISAGREE) && (status.TOTAL_BASE_COLLECTED >= padInfo[step].softcap)) {
      return 2; // success by council
    }
    if (!status.DISPUTE && (block.timestamp > padInfo[step].endBlock + holdPeriod) && (status.COUNCIL_AGREE < status.COUNCIL_DISAGREE) && (status.TOTAL_BASE_COLLECTED >= padInfo[step].softcap)) {
      return 6; // failed by council - can set dispute
    }
    if((status.DISPUTE)&&(block.timestamp > padInfo[step].endBlock + holdPeriod + disputePeriod) && (status.USER_AGREE >= status.USER_DISAGREE)) {
      return 2;
    }
    if(status.DISPUTE && status.SECOND_HOLD && (block.timestamp > padInfo[step].endBlock + 2 * holdPeriod + disputePeriod) && (status.COUNCIL_AGREE >= status.COUNCIL_DISAGREE)) {
      return 9; // fixed - can add new milestone
    }
    if(status.DISPUTE && status.SECOND_HOLD && (block.timestamp > padInfo[step].endBlock + 2 * holdPeriod + disputePeriod) && (status.COUNCIL_AGREE < status.COUNCIL_DISAGREE)) {
      return 3; // failed after 2nd hold
    }
    if(status.DISPUTE && status.SECOND_HOLD) {
      return 8; // 2nd hold
    }
    if((status.DISPUTE)&&(block.timestamp > padInfo[step].endBlock + holdPeriod + disputePeriod) && (status.USER_AGREE < status.USER_DISAGREE)) {
      return 7; // failed by dispute - can hold again
    }
    if (status.DISPUTE) {
      return 5; // dispute period
    }
    if (status.FORCE_SUCCESS) {
      return 2; // force success
    }
    if ((status.TOTAL_BASE_COLLECTED >= padInfo[step].softcap) && (block.timestamp > padInfo[step].endBlock + holdPeriod) && (status.COUNCIL_AGREE >= status.COUNCIL_DISAGREE)) {
      return 2; // success by council
    }
    if ((block.timestamp >= padInfo[step].startBlock) && (block.timestamp <= padInfo[step].endBlock)) {
      return 1; // acitve - deposits enabled;
    }
    return 0; // qued - awaiting start block
  }

  // council function
  function councilAgree () public nonReentrant {
    require(factory.userCouncilStatus(msg.sender), 'Not Council');
    require(!votedCouncil1[step][msg.sender], 'Already Voted');
    votedCouncil1[step][msg.sender] = true;
    status.COUNCIL_AGREE += 100;
  }

  function councilDisagree () public nonReentrant {
    require(factory.userCouncilStatus(msg.sender), 'Not Council');
    require(!votedCouncil1[step][msg.sender], 'Already Voted');
    votedCouncil1[step][msg.sender] = true;
    status.COUNCIL_DISAGREE += 100;
  }

  function secondAgree () public nonReentrant {
    require(status.SECOND_HOLD, "Can't vote this time");
    require(factory.userCouncilStatus(msg.sender), 'Not Council');
    require(!votedCouncil2[step][msg.sender], 'Already Voted');
    votedCouncil2[step][msg.sender] = true;
    status.COUNCIL_AGREE += 100;
  }

  function secondDisagree () public nonReentrant {
    require(status.SECOND_HOLD, "Can't vote this time");
    require(factory.userCouncilStatus(msg.sender), 'Not Council');
    require(!votedCouncil2[step][msg.sender], 'Already Voted');
    votedCouncil2[step][msg.sender] = true;
    status.COUNCIL_DISAGREE += 100;
  }

  // user functions

  function userAgree () public nonReentrant {
    require(!votedUser[step][msg.sender], 'Already Voted');
    if(buyers[msg.sender].baseDeposited > 0) {
      uint256 depositScore = buyers[msg.sender].baseDeposited / baseToken.balanceOf(address(this)) * status.NUM_BUYERS;
      if (depositScore == 0) depositScore = 1;
      uint256 userScore = oracle.requestScore(msg.sender);
      status.USER_AGREE += depositScore * userScore * 100;
    } else {
      if (factory.userCouncilStatus(msg.sender)) {
        status.USER_AGREE += 70;
      } else if (token.balanceOf(msg.sender) > 0) {
        status.USER_AGREE += 40;
      }
    }
  }

  function userDisagree () public nonReentrant {
    require(!votedUser[step][msg.sender], 'Already Voted');
    if(buyers[msg.sender].baseDeposited > 0) {
      uint256 depositScore = buyers[msg.sender].baseDeposited / baseToken.balanceOf(address(this)) * status.NUM_BUYERS;
      if (depositScore == 0) depositScore = 1;
      uint256 userScore = oracle.requestScore(msg.sender);
      status.USER_DISAGREE += depositScore * userScore * 100;
    } else {
      if (factory.userCouncilStatus(msg.sender)) {
        status.USER_DISAGREE += 70;
      } else if (token.balanceOf(msg.sender) > 0) {
        status.USER_DISAGREE += 40;
      }
    }
  }

  function userDeposit (uint256 amount) external nonReentrant {
    require(padStatus() == 1, 'Not Active');
    BuyerInfo storage buyer = buyers[msg.sender];
    uint256 remaining = padInfo[step].softcap - status.TOTAL_BASE_COLLECTED;
    uint256 amount_in = remaining < amount ? remaining : amount;
    baseToken.transferFrom(msg.sender, address(this), amount_in);
    uint256 tokensSold = amount_in.mul(padInfo[step].rate);

    require(tokensSold > 0, "ZERO TOKENS!");
    if(buyer.baseDeposited == 0) {
      status.NUM_BUYERS++;
    }
    buyer.baseDeposited = buyer.baseDeposited.add(amount_in);
    buyer.tokensOwed = buyer.tokensOwed.add(tokensSold);
    status.TOTAL_BASE_COLLECTED = status.TOTAL_BASE_COLLECTED.add(amount_in);
    status.TOTAL_TOKENS_SOLD = status.TOTAL_TOKENS_SOLD.add(tokensSold);
  }

  function userWithdrawTokens () external nonReentrant {
    require(padStatus() == 2, 'Not Success');
    BuyerInfo storage buyer = buyers[msg.sender];
    require(buyer.tokensOwed > 0, 'Nothing to Withdraw');
    uint256 bonus = buyer.tokensOwed * oracle.requestScore(msg.sender) / 1000;
    uint256 tokensOwed = buyer.tokensOwed.add(bonus);
    require(token.balanceOf(address(this)) > tokensOwed, 'Not enough Tokens');
    status.TOTAL_TOKENS_WITHDRAWN = status.TOTAL_TOKENS_WITHDRAWN.add(tokensOwed);
    buyer.tokensOwed = 0;
    token.transfer(msg.sender, tokensOwed);
  }

  function userWithdrawBaseTokens () external nonReentrant {
    require(padStatus() == 3, 'Not Failed');
    BuyerInfo storage buyer = buyers[msg.sender];
    uint256 baseRemainingDenominator = status.TOTAL_BASE_COLLECTED.sub(status.TOTAL_BASE_WITHDRAWN);
    uint256 remainingBaseBalance = baseToken.balanceOf(address(this));
    uint256 tokensOwed = remainingBaseBalance.mul(buyer.baseDeposited).div(baseRemainingDenominator);
    require(tokensOwed > 0, 'NOTHING TO WITHDRAW');
    status.TOTAL_BASE_WITHDRAWN = status.TOTAL_BASE_WITHDRAWN.add(buyer.baseDeposited);
    buyer.baseDeposited = 0;
    baseToken.transfer(msg.sender, tokensOwed);
  }

  function claimNFT(uint256 amount) external nonReentrant{
    require(padStatus() == 2, 'Not Success');
    require (token.balanceOf(msg.sender) > amount * padInfo[step].nftPrice, 'Not enough Token');
    token.transferFrom(msg.sender, address(this), amount * padInfo[step].nftPrice);
    for (uint i = 0; i < amount; i++ ) {
      nft.mint(msg.sender);
    }
  }

}