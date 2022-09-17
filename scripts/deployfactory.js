// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

const hre = require("hardhat");

const { network, run } = require("hardhat");

const fs = require("fs");
const envfile = require("envfile");

const parsedFile = envfile.parse(fs.readFileSync("./.env"));

const EthVal = require("ethval");

const namehash = require("eth-ens-namehash");

const sha3 = require("web3-utils").sha3;
const toBN = require("web3-utils").toBN;
const { ethers } = require("ethers");

async function main() {
  console.log("begin.........");

  let tx, i;

  //Get Deployer Info
  const [deployer] = await hre.ethers.getSigners();

  console.log(
    `Deploying contracts to ${network.name} with the account:${deployer.address}`
  );
  const balance = (await deployer.getBalance()).toString();
  console.log("Account balance:", balance, balance > 0);
  if (balance === 0) {
    throw `Not enough eth`;
  }

  //ENSFactory Contract
  const ENSFactory = await hre.ethers.getContractFactory("ENSFactory");
  const ensFactory = await ENSFactory.deploy();
  await ensFactory.deployed();
  parsedFile.REGISTRY_FACTORY_ADDRESS = ensFactory.address;
  console.log("ens factory address:" + ensFactory.address);

  console.log("end.........");

  fs.writeFileSync("./.env", envfile.stringify(parsedFile));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
