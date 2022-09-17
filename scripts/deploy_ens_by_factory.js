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
  let tx;
  const [deployer] = await hre.ethers.getSigners();

  let ensFactoryAddress = parsedFile.REGISTRY_FACTORY_ADDRESS;

  console.log("begin...");

  const ensFactory = await (
    await hre.ethers.getContractFactory("ENSFactory")
  ).attach(ensFactoryAddress);

  let salt = "0x899a3fde7";
  tx = await ensFactory.deploy(salt);
  await tx.wait();
  console.log(await tx.wait());

  //let addr = await ensFactory.getAddress(salt);
  //console.log("addr:" + addr);

  console.log("end...");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
