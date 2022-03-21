# EscrowpadFactory.sol

This smart contract is needed to control Escrowpads created dynamically.
We can get counts and addresses of Escrowpad by index.

  ## functions to integrate on frontend

  ### vote2Council(address _user, bool _add)
    This adds or removes user to council. 
  ### userCouncilStatus(address _user)
    This returns true(false) if user is(not) member of council.
  ### councilUsersLength()
    This returns length of council members.
  ### padsLength()
    This returns length of created lauchpads.
  ### padAtIndex(uint256 _index)
    This returns address of Escrowpad by id.
  

# EscrowpadGenerator.sol

This is for creating Escrowpads.  
Creators can create a Escrowpad with their milestones and register their Escrowpad to the LauchpadFactory contract.  
They need to input the base token(stable coin) and their NFT address to create a Escrowpad.  

  ## functions to integrate on frontend

  ### createPad(address _token, address _NFTToken, uint[5] memory uint_params)
    This creates Escrowpad.
    arguments:
      _token: token to presale
      _NFTToken: NFT to presale
      uint_params(array): milestone
        0: start time
        1: milestone duration
        2: softcap
        3: presale rate
        4: nft price

# Escrowpad.sol

This contract is deployed dynamically by LauchpadGenerator.sol.  

  ## functions to integrate on frontend
  
  ## Pad Owner functions

  ### tokenInByOwner(uint256 _amount)
    owner can tranfer tokens more to launchpad for presale
  ### setPadOwner(address _padOwner)
    owner can set new owner
  ### ownerWithdrawTokens()
    owner can withdraw tokens if pad is failed.
  ### setDispute()
    owner can set dispute
  ### addNewMilestoneI(uint256 _softcap, uint256 _rate)
    owner can set new milestone
  

  ## Dev funtions

  ### forceSucessByDev()
    Dev can force pad success.
  ### forceFailByDev()
    Dev can force pad fail.
  ### setHoldPeriod(uint256 _holdPeriod)
    Dev can change council voting duration.
  ### setDisputePeriod(uint256 _disputePeriod)
    Dev can change disputing duration.
  ### setDisputeByDev()
    Dev can set dispute
  ### set2ndHoldByDev()
    Dev can open 2nd council voting period to fix pad.


  
  ## Council funcion

  ### councilAgree()
    set agree when voting
  ### councilDisagree()
    set disagree when voting
  ### secondAgree()
    set agree when fixing pad.
  ### secondDisagree()
    set disagree when fixing pad.
  

  ## User functions

  ### userAgree()
    set agree when voting
  ### userDisagree()
    set Disagree when voting
  ### userDeposit(uint256 amount)
    deposit stable coin.
  ### userWithdrawtokens()
    user can withdraw tokens if pad success.
  ### userWithdrawBaseTokens()
    users can refund stable coin if pad failed.
  ### claimNFT(uint256 amount)
    users can claim nft with token.


