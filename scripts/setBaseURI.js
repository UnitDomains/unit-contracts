const
    hre = require("hardhat")

const {

    network,
    run
} = require("hardhat")

const fs = require('fs')
const envfile = require('envfile')

const parsedFile = envfile.parse(fs.readFileSync('./.env'))

const EthVal = require('ethval')

const namehash = require('eth-ens-namehash');

const sha3 = require('web3-utils').sha3;
const toBN = require('web3-utils').toBN;
const {
    ethers
} = require("ethers");

async function main() {
    const [deployer] = await hre.ethers.getSigners()

    let registryAddress = (parsedFile.REGISTRY_ADDRESS)
    let registrarAddress = (parsedFile.REGISTRAR_ADDRESS)
    let controllerAddress = (parsedFile.CONTROLLER_ADDRESS)
    const EnsRegistry = await (await hre.ethers.getContractFactory("ENSRegistry")).attach(registryAddress)
    const baseRegistrar = await (await hre.ethers.getContractFactory("BaseRegistrarImplementation")).attach(registrarAddress)
    const controller = await (await hre.ethers.getContractFactory("ETHRegistrarController")).attach(controllerAddress)



    let tx = await baseRegistrar.setBaseURI('https://metadata.unit.domains/' + network.name + "/" + baseRegistrar.address + "/")
    await tx.wait()






}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })