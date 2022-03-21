import { expect } from "chai";
import { Contract, Signer } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { fixture } from "./fixture";
import { constants } from 'ethers';

describe("generator", function () {
  let usdt: Contract;
  let token: Contract;
  let factory: Contract;
  let generator: Contract;
  let owner: Signer;
  let account1: Signer;
  let account2: Signer;
  let nft: Contract;
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
  });

  it("create pad", async () => {
    const start = (await ethers.provider.getBlock("latest")).timestamp + 86400;
    const duration = 86400 * 30;
    const softcap = 100;
    const rate = 100;
    const nftPrice = 100;
    const balance1 = await token.balanceOf(owner.getAddress());
    // approve token for generator
    await token.approve(generator.address, balance1);
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
    const balance2 = await token.balanceOf(owner.getAddress());
    expect(balance1 > balance2).to.true;
    const padsLength = await factory.padsLength();
    expect(padsLength).to.eq(1);
    const padAddress = await factory.padAtIndex(0);
    expect(padAddress).to.not.eq(constants.AddressZero);
  });
  it("can't create with not eough tokens", async () => {
    const start = (await ethers.provider.getBlock("latest")).timestamp + 86400;
    const duration = 86400 * 30;
    const softcap = 100;
    const rate = 100;
    const nftPrice = 100;
    const balance = await token.balanceOf(account1.getAddress());
    // approve token
    await token.connect(account1).approve(generator.address, balance);
    // create pad
    await expect(generator.connect(account1).createPad(
      token.address,
      nft.address,
      [
        start,
        duration,
        parseEther(String(softcap)),
        rate,
        parseEther(String(nftPrice))
      ]
    )).to.revertedWith('ERC20: insufficient allowance');
  });
  it("doesn't allow to create pad when start time is earlier than current", async () => {
    const start = (await ethers.provider.getBlock("latest")).timestamp;
    const duration = 86400 * 30;
    const softcap = 100;
    const rate = 100;
    const nftPrice = 100;
    const balance1 = await token.balanceOf(owner.getAddress());
    // approve token for generator
    await token.approve(generator.address, balance1);
    // create pad
    await expect(generator.createPad(
      token.address,
      nft.address,
      [
        start,
        duration,
        parseEther(String(softcap)),
        rate,
        parseEther(String(nftPrice))
      ]
    )).to.revertedWith('Invalid start time');
  });
  it("doesn't allow pad creation when duration is shorter than 2 weeks", async () => {
    const start = (await ethers.provider.getBlock("latest")).timestamp + 86400;
    const duration = 86400 * 7;
    const softcap = 100;
    const rate = 100;
    const nftPrice = 100;
    const balance1 = await token.balanceOf(owner.getAddress());
    // approve token for generator
    await token.approve(generator.address, balance1);
    // create pad
    await expect(generator.createPad(
      token.address,
      nft.address,
      [
        start,
        duration,
        parseEther(String(softcap)),
        rate,
        parseEther(String(nftPrice))
      ]
    )).to.revertedWith('Short market duration');
  });
  it("doesn't allow pad creation when softcap is zero", async () => {
    const start = (await ethers.provider.getBlock("latest")).timestamp + 86400;
    const duration = 86400 * 14;
    const softcap = 0;
    const rate = 100;
    const nftPrice = 100;
    const balance1 = await token.balanceOf(owner.getAddress());
    // approve token for generator
    await token.approve(generator.address, balance1);
    // create pad
    await expect(generator.createPad(
      token.address,
      nft.address,
      [
        start,
        duration,
        parseEther(String(softcap)),
        rate,
        parseEther(String(nftPrice))
      ]
    )).to.revertedWith('Softcap must not be zero');
  });
  it("doesn't allow pad creation when presale rate is zero", async () => {
    const start = (await ethers.provider.getBlock("latest")).timestamp + 86400;
    const duration = 86400 * 14;
    const softcap = 100;
    const rate = 0;
    const nftPrice = 100;
    const balance1 = await token.balanceOf(owner.getAddress());
    // approve token for generator
    await token.approve(generator.address, balance1);
    // create pad
    await expect(generator.createPad(
      token.address,
      nft.address,
      [
        start,
        duration,
        parseEther(String(softcap)),
        rate,
        parseEther(String(nftPrice))
      ]
    )).to.revertedWith('Invalid param');
  });
});