// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import { utils } from "ethers";
import { parseEther } from "ethers/lib/utils";
async function main() {
  const [owner, account1, account2] = await ethers.getSigners();
  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy(parseEther("100000"));
  await token.deployed();
  console.log("token:", token.address);

  const NFT = await ethers.getContractFactory("NFTToken");
  const nft = await NFT.deploy();
  console.log("nft:", nft.address);

  const USDT = await ethers.getContractFactory("MockUSDT");
  const usdt = await USDT.deploy(parseEther("3000"));
  await usdt.deployed();
  console.log("usdt:", usdt.address);

  const Factory = await ethers.getContractFactory("EscrowPadFactory");
  const factory = await Factory.deploy();
  await factory.deployed();
  console.log("factory:", factory.address);

  const Oracle = await ethers.getContractFactory("ScoreOracle");
  const oracle = await Oracle.deploy(
    owner.address,
    token.address,
    nft.address
  );
  await oracle.deployed();
  console.log("oracle:", oracle.address);

  const Generator = await ethers.getContractFactory("EscrowPadGenerator");
  const generator = await Generator.deploy(
    factory.address,
    owner.address,
    usdt.address,
    oracle.address
  );
  await generator.deployed();
  console.log("generator:", generator.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
