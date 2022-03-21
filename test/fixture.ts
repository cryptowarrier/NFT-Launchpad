import { parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

interface Fixture {
  owner: Signer;
  account1: Signer;
  account2: Signer;
  token: Contract;
  usdt: Contract;
  factory: Contract;
  generator: Contract;
  oracle: Contract;
  nft: Contract;
}

export async function fixture(): Promise <Fixture> {
  const [owner, account1, account2] = await ethers.getSigners();
  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy(parseEther("100000"));
  await token.deployed();
  token.transfer(account1.address, parseEther("3000"));

  const NFT = await ethers.getContractFactory("NFTToken");
  const nft = await NFT.deploy();

  const USDT = await ethers.getContractFactory("MockUSDT");
  const usdt = await USDT.deploy(parseEther("3000"));
  await usdt.deployed();
  await usdt.transfer(account1.address, parseEther("1000"));

  const Factory = await ethers.getContractFactory("EscrowPadFactory");
  const factory = await Factory.deploy();
  await factory.deployed();

  const Oracle = await ethers.getContractFactory("ScoreOracle");
  const oracle = await Oracle.deploy(
    owner.address,
    token.address,
    nft.address
  );
  await oracle.deployed();

  const Generator = await ethers.getContractFactory("EscrowPadGenerator");
  const generator = await Generator.deploy(
    factory.address,
    owner.address,
    usdt.address,
    oracle.address
  );
  await generator.deployed();

  return {
    owner,
    account1,
    account2,
    token,
    usdt,
    factory,
    generator,
    oracle,
    nft
  }

}