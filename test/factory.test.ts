import { expect } from "chai";
import { Contract, Signer } from "ethers";
import { fixture } from "./fixture";

describe("factory", function () {
  let usdt: Contract;
  let token: Contract;
  let factory: Contract;
  let generator: Contract;
  let owner: Signer;
  let account1: Signer;
  beforeEach(async() => {
    const fixtures = await fixture();
    usdt = fixtures.usdt;
    token = fixtures.token;
    factory = fixtures.factory;
    generator = fixtures.generator;
    owner = fixtures.owner;
    account1 = fixtures.account1;
  });
  it("get factory pads length", async () => {
    const length = await factory.padsLength();
    expect(length).to.eq(0);
  });
  it("doesn't allow to get unregistered pad", async () => {
    const length = await factory.padsLength();
    await expect(factory.padAtIndex(length)).to.reverted;
  });
  it("add council user by owner", async () => {
    await factory.vote2Council(account1.getAddress(), true);
    const result = await factory.userCouncilStatus(account1.getAddress());
    expect(result).to.true;
  });
  it("doesn't allow to add council user by not owner", async () => {
    await expect(factory.connect(account1).vote2Council(account1.getAddress(), true)).to.revertedWith(
      'Ownable: caller is not the owner'
    );
  });
  it("remove council user by owner", async () => {
    await factory.vote2Council(account1.getAddress(), true);
    let result = await factory.userCouncilStatus(account1.getAddress());
    expect(result).to.true;
    await factory.vote2Council(account1.getAddress(), false);
    result = await factory.userCouncilStatus(account1.getAddress());
    expect(result).to.false;
  });
  it("doesn't allow to remove council user by not owner", async () => {
    await factory.vote2Council(account1.getAddress(), true);
    const result = await factory.userCouncilStatus(account1.getAddress());
    expect(result).to.true;
    await expect(factory.connect(account1).vote2Council(account1.getAddress(), false)).to.revertedWith(
      'Ownable: caller is not the owner'
    );
  });
});