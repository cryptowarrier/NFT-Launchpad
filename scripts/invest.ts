import { parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { addresses } from './constants';

async function main () {
  const mockUSDT = await ethers.getContractAt("MockUSDT", addresses.MockUSDT);
  const MPTLToken = await ethers.getContractAt("MPTLToken", addresses.MPTLToken);
  const NFTToken = await ethers.getContractAt("NFTToken", addresses.NFTToken);
  const token = await ethers.getContractAt("Token", addresses.token);
  const factory = await ethers.getContractAt("LaunchpadFactory", addresses.factory);
  const generator = await ethers.getContractAt("LaunchpadGenerator", addresses.generator);

  const launchpadsLength = await factory.launchpadsLength();
  const [owner] = await ethers.getSigners();
  for(let i = 0; i < launchpadsLength.toNumber() ; i++) {
    const padAddress = await factory.launchpadAtIndex(i);
    const pad = await ethers.getContractAt("NFTLaunchpad", padAddress);
    // approve
    const approveTx = await mockUSDT.approve(padAddress, parseEther("10"));
    await approveTx.wait();
    // invest
    const investTx = await pad.invest(parseEther("10"));
    await investTx.wait();
    const userInfo = await pad.users(owner.address);
    console.log(userInfo.deposits);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});