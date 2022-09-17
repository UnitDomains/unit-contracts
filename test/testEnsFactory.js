const { ethers, network, run } = require("hardhat");

const { expect } = require("chai");

const fs = require("fs");
const envfile = require("envfile");

const namehash = require("eth-ens-namehash");
const sha3 = require("web3-utils").sha3;
const toBN = require("web3-utils").toBN;

const EthVal = require("ethval");

const DAYS = 24 * 60 * 60;
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

let ens;
let ensFactory;

const secret =
  "0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF";

describe("ENSFactory", function () {
  before(async () => {
    //Get Deployer Info
    [deployer, registranter] = await hre.ethers.getSigners();
    ownerAccount = deployer.address; // Account that owns the registrar

    const ENSFactory = await hre.ethers.getContractFactory("ENSFactory");
    ensFactory = await ENSFactory.deploy();
    await ensFactory.deployed();
  });

  it("ENSFactory getAddress", async function () {
    console.log(await ensFactory.getAddress("123"));
  });
});
