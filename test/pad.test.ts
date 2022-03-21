import { expect } from "chai";
import { Contract, Signer } from "ethers";
import { formatEther, parseEther } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { fixture } from "./fixture";
import { BigNumber } from 'ethers';

describe("pad", function () {
  let usdt: Contract;
  let token: Contract;
  let factory: Contract;
  let generator: Contract;
  let owner: Signer;
  let account1: Signer;
  let account2: Signer;
  let nft: Contract;
  let pad: Contract;
  this.beforeEach(async () => {
    const fixtures = await fixture();
    usdt = fixtures.usdt;
    token = fixtures.token;
    factory = fixtures.factory;
    generator = fixtures.generator;
    owner = fixtures.owner;
    account1 = fixtures.account1;
    account2 = fixtures.account2;
    nft = fixtures.nft;
    const start = (await ethers.provider.getBlock("latest")).timestamp + 86400;
    const duration = 86400 * 14;
    const softcap = 100;
    const rate = 100;
    const nftPrice = 10000;
    const balance = await token.balanceOf(owner.getAddress());
    // approve token
    await token.approve(generator.address, balance);
    // create pad
    await generator.createPad(
      token.address,
      nft.address,
      [
        start,
        duration,
        parseEther(String(softcap)),
        rate,
        parseEther(String(nftPrice))
      ]
    );
    const padAddress = await factory.padAtIndex(0);
    pad = await ethers.getContractAt("EscrowPad", padAddress);
    // add council member
    await factory.vote2Council(owner.getAddress(), true);
    await factory.vote2Council(account1.getAddress(), true);
  });

  it("pad is qued before start block", async () => {
    const status = await pad.padStatus();
    expect(status).to.eq(0); // awaiting start block
  });
  it("pad is active after start block", async () => {
    // increase time
    await network.provider.send("evm_increaseTime", [86400]); 
    await network.provider.send("evm_mine");
    // status
    const status = await pad.padStatus();
    expect(status).to.eq(1); // active
  });
  it("user deposits", async () => {
    // increase time
    await network.provider.send("evm_increaseTime", [86400]); 
    await network.provider.send("evm_mine");
    const userBalance1 = await usdt.balanceOf(owner.getAddress());
    // approve usdt
    await usdt.approve(pad.address, parseEther("50"));
    // deposit
    await pad.userDeposit(parseEther("50"));
    const userBalance2 = await usdt.balanceOf(owner.getAddress());
    expect(Number(formatEther(userBalance2)) + 50).to.eq(Number(formatEther(userBalance1)));
    const depositBalance = await usdt.balanceOf(pad.address);
    expect(depositBalance).to.eq(parseEther("50"));
    const userInfo = await pad.buyers(owner.getAddress());
    expect(userInfo[0]).to.eq(parseEther("50"));
  });
  it("pad will be failed when softcap not meet by end block", async () => {
    // increase time
    await network.provider.send("evm_increaseTime", [86400]); 
    await network.provider.send("evm_mine");
    // approve usdt
    await usdt.approve(pad.address, parseEther("50"));
    // deposit
    await pad.userDeposit(parseEther("50"));
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 14]); 
    await network.provider.send("evm_mine");
    const status = await pad.padStatus();
    expect(status).to.eq(3); // fail
  });
  it("can't withdraw token if failed", async () => {
    // increase time
    await network.provider.send("evm_increaseTime", [86400]); 
    await network.provider.send("evm_mine");
    // approve usdt
    await usdt.approve(pad.address, parseEther("50"));
    // deposit
    await pad.userDeposit(parseEther("50"));
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 14]); 
    await network.provider.send("evm_mine");
    const status = await pad.padStatus();
    expect(status).to.eq(3); // fail
    await expect(pad.userWithdrawTokens()).to.revertedWith('Not Success');
  });
  it("can't claim nft if failed", async () => {
    // increase time
    await network.provider.send("evm_increaseTime", [86400]); 
    await network.provider.send("evm_mine");
    // approve usdt
    await usdt.approve(pad.address, parseEther("50"));
    // deposit
    await pad.userDeposit(parseEther("50"));
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 14]); 
    await network.provider.send("evm_mine");
    const status = await pad.padStatus();
    expect(status).to.eq(3); // fail
    const balance = await token.balanceOf(owner.getAddress());
    // token approve
    await token.approve(pad.address, balance);
    await expect(pad.claimNFT(1)).to.revertedWith('Not Success');
  });
  it("pad will be hold when meet softcap by end block", async () => {
    // increase time
    await network.provider.send("evm_increaseTime", [86400]); 
    await network.provider.send("evm_mine");
    // approve usdt
    await usdt.approve(pad.address, parseEther("50"));
    await usdt.connect(account1).approve(pad.address, parseEther("50"));
    // deposit
    await pad.userDeposit(parseEther("50"));
    await pad.connect(account1).userDeposit(parseEther("50"));
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 14]); 
    await network.provider.send("evm_mine");
    const status = await pad.padStatus();
    expect(status).to.eq(4); // hold 
  });
  it("doesn't allow to vote by not council member in hold period", async () => {
    // increase time
    await network.provider.send("evm_increaseTime", [86400]); 
    await network.provider.send("evm_mine");
    // approve usdt
    await usdt.approve(pad.address, parseEther("50"));
    await usdt.connect(account1).approve(pad.address, parseEther("50"));
    // deposit
    await pad.userDeposit(parseEther("50"));
    await pad.connect(account1).userDeposit(parseEther("50"));
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 14]); 
    await network.provider.send("evm_mine");
    // agree
    await expect(pad.connect(account2).councilAgree()).to.revertedWith('Not Council');
  });
  it("pad will be success if council agree", async () => {
    // increase time
    await network.provider.send("evm_increaseTime", [86400]); 
    await network.provider.send("evm_mine");
    // approve usdt
    await usdt.approve(pad.address, parseEther("50"));
    await usdt.connect(account1).approve(pad.address, parseEther("50"));
    // deposit
    await pad.userDeposit(parseEther("50"));
    await pad.connect(account1).userDeposit(parseEther("50"));
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 14]); 
    await network.provider.send("evm_mine");
    // agree
    await pad.councilAgree();
    await pad.connect(account1).councilAgree();
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 7]); 
    await network.provider.send("evm_mine");
    const status = await pad.padStatus();
    expect(status).to.eq(2); // success by council
  });
  it("users can withdraw tokens if successed", async () => {
    // increase time
    await network.provider.send("evm_increaseTime", [86400]); 
    await network.provider.send("evm_mine");
    // approve usdt
    await usdt.approve(pad.address, parseEther("50"));
    await usdt.connect(account1).approve(pad.address, parseEther("50"));
    // deposit
    await pad.userDeposit(parseEther("50"));
    await pad.connect(account1).userDeposit(parseEther("50"));
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 14]); 
    await network.provider.send("evm_mine");
    // agree
    await pad.councilAgree();
    await pad.connect(account1).councilAgree();
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 7]); 
    await network.provider.send("evm_mine");
    const status = await pad.padStatus();
    expect(status).to.eq(2); // success by council
    const balance1 = await token.balanceOf(owner.getAddress());
    await pad.userWithdrawTokens();
    const balance2 = await token.balanceOf(owner.getAddress());
    expect(balance1 < balance2).to.true;
    const balance3 = await token.balanceOf(account1.getAddress());
    await pad.connect(account1).userWithdrawTokens();
    const balance4 = await token.balanceOf(account1.getAddress());
    expect(balance3 < balance4).to.true;
  });
  it("users can claim nft if successed", async () => {
    // increase time
    await network.provider.send("evm_increaseTime", [86400]); 
    await network.provider.send("evm_mine");
    // approve usdt
    await usdt.approve(pad.address, parseEther("50"));
    await usdt.connect(account1).approve(pad.address, parseEther("50"));
    // deposit
    await pad.userDeposit(parseEther("50"));
    await pad.connect(account1).userDeposit(parseEther("50"));
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 14]); 
    await network.provider.send("evm_mine");
    // agree
    await pad.councilAgree();
    await pad.connect(account1).councilAgree();
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 7]); 
    await network.provider.send("evm_mine");
    const status = await pad.padStatus();
    expect(status).to.eq(2); // success by council
    const nftBalance1 = await nft.balanceOf(owner.getAddress());
    const tokenBalance1 = await token.balanceOf(owner.getAddress());
    // token approve
    await token.approve(pad.address, tokenBalance1);
    await pad.claimNFT(2);
    const nftBalance2 = await nft.balanceOf(owner.getAddress());
    const tokenBalance2 = await token.balanceOf(owner.getAddress());
    expect(nftBalance1 < nftBalance2).to.true;
    expect(tokenBalance1 > tokenBalance2).to.true;
  });
  it("set dispute if council disagree", async () => {
    // increase time
    await network.provider.send("evm_increaseTime", [86400]); 
    await network.provider.send("evm_mine");
    // approve usdt
    await usdt.approve(pad.address, parseEther("50"));
    await usdt.connect(account1).approve(pad.address, parseEther("50"));
    // deposit
    await pad.userDeposit(parseEther("50"));
    await pad.connect(account1).userDeposit(parseEther("50"));
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 14]); 
    await network.provider.send("evm_mine");
    // agree
    await pad.councilDisagree();
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 7]); 
    await network.provider.send("evm_mine");
    // set dispute
    await pad.setDisputeByDev();
    const status = await pad.padStatus();
    expect(status).to.eq(5); // dispute
  });
  it("doesn't allow dispute in hold period", async () => {
    // increase time
    await network.provider.send("evm_increaseTime", [86400]); 
    await network.provider.send("evm_mine");
    // approve usdt
    await usdt.approve(pad.address, parseEther("50"));
    await usdt.connect(account1).approve(pad.address, parseEther("50"));
    // deposit
    await pad.userDeposit(parseEther("50"));
    await pad.connect(account1).userDeposit(parseEther("50"));
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 14]); 
    await network.provider.send("evm_mine");
    // agree
    await pad.councilDisagree();
    // set dispute
    await expect(pad.setDisputeByDev()).to.revertedWith('Can not dispute this time');
  });
  it("success after dispute", async () => {
    // increase time
    await network.provider.send("evm_increaseTime", [86400]); 
    await network.provider.send("evm_mine");
    // approve usdt
    await usdt.approve(pad.address, parseEther("50"));
    await usdt.connect(account1).approve(pad.address, parseEther("50"));
    // deposit
    await pad.userDeposit(parseEther("50"));
    await pad.connect(account1).userDeposit(parseEther("50"));
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 14]); 
    await network.provider.send("evm_mine");
    // agree
    await pad.councilDisagree();
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 7]); 
    await network.provider.send("evm_mine");
    // set dispute
    await pad.setDisputeByDev();
    await pad.userAgree();
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 7]); 
    await network.provider.send("evm_mine");
    const status = await pad.padStatus();
    expect(status).to.eq(2); // success after dispute
  });
  it("can set 2nd hold if pad is failed after dispute", async () => {
    // increase time
    await network.provider.send("evm_increaseTime", [86400]); 
    await network.provider.send("evm_mine");
    // approve usdt
    await usdt.approve(pad.address, parseEther("50"));
    await usdt.connect(account1).approve(pad.address, parseEther("50"));
    // deposit
    await pad.userDeposit(parseEther("50"));
    await pad.connect(account1).userDeposit(parseEther("50"));
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 14]); 
    await network.provider.send("evm_mine");
    // agree
    await pad.councilDisagree();
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 7]); 
    await network.provider.send("evm_mine");
    // set dispute
    await pad.setDisputeByDev();
    await pad.userDisagree();
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 7]); 
    await network.provider.send("evm_mine");
    // hold again
    await pad.set2ndHoldByDev();
    const status = await pad.padStatus();
    expect(status).to.eq(8); // 2nd hold period
  });
  it("doesn't allow 2nd hold if successed after dispute", async() => {
    // increase time
    await network.provider.send("evm_increaseTime", [86400]); 
    await network.provider.send("evm_mine");
    // approve usdt
    await usdt.approve(pad.address, parseEther("50"));
    await usdt.connect(account1).approve(pad.address, parseEther("50"));
    // deposit
    await pad.userDeposit(parseEther("50"));
    await pad.connect(account1).userDeposit(parseEther("50"));
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 14]); 
    await network.provider.send("evm_mine");
    // agree
    await pad.councilDisagree();
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 7]); 
    await network.provider.send("evm_mine");
    // set dispute
    await pad.setDisputeByDev();
    await pad.userAgree();
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 7]); 
    await network.provider.send("evm_mine");
    // hold again
    await expect(pad.set2ndHoldByDev()).to.revertedWith('Can not hold again this time');
  });
  it("can add new milestone after fixed", async () => {
    // increase time
    await network.provider.send("evm_increaseTime", [86400]); 
    await network.provider.send("evm_mine");
    // approve usdt
    await usdt.approve(pad.address, parseEther("50"));
    await usdt.connect(account1).approve(pad.address, parseEther("50"));
    // deposit
    await pad.userDeposit(parseEther("50"));
    await pad.connect(account1).userDeposit(parseEther("50"));
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 14]); 
    await network.provider.send("evm_mine");
    // agree
    await pad.councilDisagree();
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 7]); 
    await network.provider.send("evm_mine");
    // set dispute
    await pad.setDisputeByDev();
    await pad.userDisagree();
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 7]); 
    await network.provider.send("evm_mine");
    // hold again
    await pad.set2ndHoldByDev();
    // agree
    await pad.secondAgree();
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 7]); 
    await network.provider.send("evm_mine");
    // add new milestone
    await pad.addNewMilestone(
      parseEther("200"),
      150
    );
    const status = await pad.padStatus();
    expect(status).to.eq(1); // active again
  });
  it("will be failed if not fixed", async () => {
    // increase time
    await network.provider.send("evm_increaseTime", [86400]); 
    await network.provider.send("evm_mine");
    // approve usdt
    await usdt.approve(pad.address, parseEther("50"));
    await usdt.connect(account1).approve(pad.address, parseEther("50"));
    // deposit
    await pad.userDeposit(parseEther("50"));
    await pad.connect(account1).userDeposit(parseEther("50"));
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 14]); 
    await network.provider.send("evm_mine");
    // agree
    await pad.councilDisagree();
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 7]); 
    await network.provider.send("evm_mine");
    // set dispute
    await pad.setDisputeByDev();
    await pad.userDisagree();
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 7]); 
    await network.provider.send("evm_mine");
    // hold again
    await pad.set2ndHoldByDev();
    // agree
    await pad.secondDisagree();
    // increase time
    await network.provider.send("evm_increaseTime", [86400 * 7]); 
    await network.provider.send("evm_mine");
    // add new milestone
    const status = await pad.padStatus();
    expect(status).to.eq(3); // failed
  });
});