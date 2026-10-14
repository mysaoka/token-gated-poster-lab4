import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { keccak256, stringToHex, zeroAddress } from "viem";

describe("Poster", async function () {
  const { viem } = await network.create();
  const client = await viem.getPublicClient();
  const [creator, other] = await viem.getWalletClients();
  async function setup() {
    const token = await viem.deployContract("Token", ["TestToken", "TTKN", 100n]);
    const poster = await viem.deployContract("Poster", [token.address, 10n]);
    return { token, poster };
  }
  it("post ok", async () => {
    const { token, poster } = await setup();
    assert.equal(await token.read.balanceOf([creator.account.address]), 100n);
    const fromBlock = await client.getBlockNumber();
    const query = {address:poster.address, abi:poster.abi, eventName:"NewPost", fromBlock, strict:true} as const;
    assert.deepEqual(await client.getContractEvents(query), []);
    await poster.write.post(["Hello, world!", "hello"]);
    const events = await client.getContractEvents(query);
    assert.equal(events.length, 1);
    assert.equal(events[0].args.user.toLowerCase(), creator.account.address.toLowerCase());
    assert.equal(events[0].args.content, "Hello, world!");
    assert.equal(events[0].args.tag, keccak256(stringToHex("hello")));
    assert.equal(await token.read.balanceOf([creator.account.address]), 100n);
  });
  it("not enough tokens", async () => {
    const { token, poster } = await setup();
    assert.equal(await token.read.balanceOf([other.account.address]), 0n);
    await viem.assertions.revertWith(poster.write.post(["Denied", "hello"], {account:other.account}), "Not enough tokens");
    const events=await client.getContractEvents({address:poster.address,abi:poster.abi,eventName:"NewPost",fromBlock:0n});
    assert.equal(events.length,0);
  });
  it("exact threshold permits posting; losing one unit denies it", async () => {
    const { token, poster } = await setup();
    await token.write.transfer([other.account.address,10n]);
    await viem.assertions.emit(poster.write.post(["Exact threshold", "test"], {account:other.account}), poster,"NewPost");
    await token.write.transfer([creator.account.address,1n], {account:other.account});
    await viem.assertions.revertWith(poster.write.post(["Below", "test"], {account:other.account}), "Not enough tokens");
  });
  it("only owner changes configuration and ownership", async () => {
    const {token,poster}=await setup();
    await viem.assertions.revertWith(poster.write.setThreshold([0n],{account:other.account}),"Ownable: caller is not the owner");
    await viem.assertions.revertWith(poster.write.setTokenAddress([token.address],{account:other.account}),"Ownable: caller is not the owner");
    await viem.assertions.revertWith(poster.write.transferOwnership([other.account.address],{account:other.account}),"Ownable: caller is not the owner");
    await poster.write.setThreshold([101n]);
    await viem.assertions.revertWith(poster.write.post(["Denied", "test"]),"Not enough tokens");
    await poster.write.transferOwnership([other.account.address]);
    await viem.assertions.revertWith(poster.write.setThreshold([0n]),"Ownable: caller is not the owner");
    await poster.write.setThreshold([0n],{account:other.account});
    await poster.write.post(["Zero threshold", "test"],{account:other.account});
    assert.equal(await poster.read.threshold(),0n);
  });
  it("changing the token uses the new token balance", async () => {
    const {token,poster}=await setup();
    await token.write.transfer([other.account.address,10n]);
    const second=await viem.deployContract("Token",["Second","SEC",100n]);
    await poster.write.setTokenAddress([second.address]);
    assert.equal((await poster.read.tokenAddress()).toLowerCase(),second.address.toLowerCase());
    await viem.assertions.revertWith(poster.write.post(["Old tokens", "test"],{account:other.account}),"Not enough tokens");
    await second.write.transfer([other.account.address,10n]);
    await poster.write.post(["New tokens", "test"],{account:other.account});
  });
  it("zero token address denies posts even at zero threshold", async () => {
    const poster=await viem.deployContract("Poster",[zeroAddress,0n]);
    await viem.assertions.revert(poster.write.post(["Not configured","test"]));
  });
  it("ten whole tokens respects 18 decimals", async () => {
    const unit=10n**18n;
    const token=await viem.deployContract("Token",["KWNcoin","KWN",100000n*unit]);
    const poster=await viem.deployContract("Poster",[token.address,10n*unit]);
    await token.write.transfer([other.account.address,10n*unit-1n]);
    await viem.assertions.revertWith(poster.write.post(["Too little","test"],{account:other.account}),"Not enough tokens");
    await token.write.transfer([other.account.address,1n]);
    await poster.write.post(["Ten tokens","test"],{account:other.account});
  });
});
