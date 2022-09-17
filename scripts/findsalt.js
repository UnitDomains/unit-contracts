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
  const [deployer] = await hre.ethers.getSigners();

  let ensFactoryAddress = parsedFile.REGISTRY_FACTORY_ADDRESS;

  console.log("begin...");

  const ensFactory = await (
    await hre.ethers.getContractFactory("ENSFactory")
  ).attach(ensFactoryAddress);

  // find the specific salt by method
  /*
 
  for (let i = 0; i < 0xfffffff; i++) {
    let salt = i;

    let addr = await ensFactory.getAddress(salt);
    console.log(i + "-addr:" + addr);

    if (addr.startsWith("0000")) {
      console.log(salt);
      console.log(addr);
      break;
    }
    }*/

  // find the specific salt by computation

  bytecode = await ensFactory.getBytecode();

  let bytecodeHash = ethers.utils.keccak256(bytecode).substring(2);

  /*
  {
    let i = 500;
    let salt = i.toString(16).padStart(64, "0");

    let payload = "0xff" + ensFactoryAddress.substring(2) + salt + bytecodeHash;
    console.log(payload);

    let addr = ethers.utils.keccak256(payload).substring(26);
    console.log(addr);
  }
  */

  let i = BigInt("0x259f7c14");

  let salt;
  let payloadPrefix = "0xff" + ensFactoryAddress.substring(2);

  let addr;

  for (; ; i++) {
    salt = i.toString(16).padStart(64, "0");

    addr = ethers.utils
      .keccak256(payloadPrefix + salt + bytecodeHash)
      .substring(26);

    // Find a specific salt if it begins with the specified prefix:

    if (addr.startsWith("0000000")) {
      console.log(salt);
      console.log(addr);

      if (addr.startsWith("00000000")) {
        console.log(salt);
        console.log(addr);

        if (addr.startsWith("000000000")) {
          console.log(salt);
          console.log(addr);

          if (addr.startsWith("0000000000")) {
            console.log(salt);
            console.log(addr);

            if (addr.startsWith("00000000000")) {
              console.log(salt);
              console.log(addr);
              break;
            }
          }
        }
      }
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
