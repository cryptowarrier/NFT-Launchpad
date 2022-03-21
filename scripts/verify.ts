// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import hre, { ethers } from "hardhat";
import { utils } from "ethers";
import { parseEther } from "ethers/lib/utils";


async function main() {
  const args = [
    "0xc57b33452b4f7bb189bb5afae9cc4aba1f7a4fd8",
    utils.toUtf8Bytes("29fa9aa13bf1468788b7cc4a500a45b8"),
    parseEther("0.1"),
    "0xD2Eb16cF3a5d61AC0cA4B2fa78D02Ce9Ba3A9de8"
  ];
  await hre.run("verify", {
    address: "0x924A04cB3dA408006923CE945bb38c1C60882dC7",
    constructorArgs: args
  })
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
