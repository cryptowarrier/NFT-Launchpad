import { utils } from "ethers";
import { parseEther, formatEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { addresses } from './constants';

async function main() {
  const [owner] = await ethers.getSigners();
  const usdt = await ethers.getContractAt("MockUSDT", addresses['usdt']);
  const token = await ethers.getContractAt("Token", addresses['token']);
  const factory = await ethers.getContractAt("EscrowPadFactory", addresses['factory']);
  const generator = await ethers.getContractAt("EscrowPadGenerator", addresses['generator']);
  const nft = await ethers.getContractAt("NFTToken", addresses['nft']);
  const start = Math.floor(new Date().getTime() / 1000) + 600;
  const duration = 86400 * 30;
  const softcap = 100;
  const rate = 100;
  const nftPrice = 100;
  let balance = await token.balanceOf(owner.address);
  console.log(formatEther(String(balance)))
  // // approve token
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
  balance = await token.balanceOf(owner.address);
  console.log(formatEther(String(balance)))
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});