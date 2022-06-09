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

const DAYS = 24 * 60 * 60;
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

//about
const ABOUT_LABEL = sha3("about");
const ABOUT_NAMEHASH = namehash.hash("about");
const ABOUT_RESOLVER_HASH = namehash.hash("resolver.about");

function getReverseNode(addr) {
  return namehash.hash(addr.slice(2).toLowerCase() + ".addr.reverse");
}

const interfaces = {
  legacyRegistrar: "0x7ba18ba1",
  permanentRegistrar: "0x018fac06",
  permanentRegistrarWithConfig: "0xca27ac4c",
  baseRegistrar: "0x6ccb2df4",
  bulkRenewal: "0x3150bfba",
  linearPriceOracle: "0x5e75f6a9",
};

const {
  legacyRegistrar: legacyRegistrarInterfaceId,
  permanentRegistrar: permanentRegistrarInterfaceId,
  permanentRegistrarWithConfig: permanentRegistrarWithConfigInterfaceId,
  bulkRenewal: bulkRenewalInterfaceId,
  linearPriceOracle: linearPriceOracleInterfaceId,
} = interfaces;

const yearInSeconds = 31556952;

function calculateDuration(years) {
  return parseInt(parseFloat(years) * yearInSeconds);
}

const tenThousandsETH = ethers.BigNumber.from(
  ethers.utils.parseEther("10000.0")
); // 10000 ETH
const thousandETH = ethers.BigNumber.from(ethers.utils.parseEther("1000.0")); // 1000 ETH
const hundredETH = ethers.BigNumber.from(ethers.utils.parseEther("100.0")); // 100 ETH
const tenETH = ethers.BigNumber.from(ethers.utils.parseEther("10.0")); // 10 ETH
const oneETH = ethers.BigNumber.from(ethers.utils.parseEther("1.0")); // 1 ETH
const halfETH = ethers.BigNumber.from(ethers.utils.parseEther("0.5")); // 0.5 ETH
const tenthETH = ethers.BigNumber.from(ethers.utils.parseEther("0.1")); // 0.1 ETH
const percentETH = ethers.BigNumber.from(ethers.utils.parseEther("0.01")); // 0.01 ETH
const millesimalETH = ethers.BigNumber.from(ethers.utils.parseEther("0.001")); // 0.001 ETH

const premium = oneETH;
const decreaseDuration = ethers.BigNumber.from(90 * DAYS);
const decreaseRate = premium.div(decreaseDuration);

var allDomainNames = process.env.DOMAIN_NAMES;
var domainNameArray = allDomainNames.split(",");

//Domains
var domainNames = [];
var domainLabels = [];
var domainNameHashes = [];
var domainResolverHashes = [];

domainNameArray.forEach((domainName) => {
  domainNames.push(domainName);
  domainLabels.push(sha3(domainName));
  domainNameHashes.push(namehash.hash(domainName));
  domainResolverHashes.push(namehash.hash("resolver." + domainName));
});

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

  //ENS Contract
  const Ens = await hre.ethers.getContractFactory("ENSRegistry");
  const ens = await Ens.deploy();
  await ens.deployed();
  parsedFile.REGISTRY_ADDRESS = ens.address;
  console.log("ens address:" + ens.address);

  //Root Contract
  const Root = await hre.ethers.getContractFactory("Root");
  const root = await Root.deploy(ens.address);
  await root.deployed();
  parsedFile.ROOT_ADDRESS = root.address;
  console.log("root address:" + root.address);

  tx = await root.setController(deployer.address, true);
  await tx.wait();

  tx = await ens.setOwner(ZERO_HASH, root.address);
  console.log(`setOwner on ens contract (tx: ${tx.hash})...`);
  await tx.wait();

  //BulkRenewal Contract
  //const BulkRenewal = await hre.ethers.getContractFactory("BulkRenewal");
  //const bulkRenewal = await BulkRenewal.deploy(ens.address);
  //await bulkRenewal.deployed();
  //console.log("bulkRenewal address:" + bulkRenewal.address)

  //部署注册器
  const BaseRegistrar = await hre.ethers.getContractFactory(
    "BaseRegistrarImplementation"
  );
  const baseRegistrar = await BaseRegistrar.deploy(
    ens.address,
    domainNameHashes
  );
  await baseRegistrar.deployed();
  await baseRegistrar.setBaseURI(
    "https://metadata.unit.domains/" +
      network.name +
      "/" +
      baseRegistrar.address +
      "/"
  );

  parsedFile.REGISTRAR_ADDRESS = baseRegistrar.address;
  console.log("baseRegistrar address:" + baseRegistrar.address);

  //subdomain
  const SubdomainRegistrar = await hre.ethers.getContractFactory(
    "SubdomainRegistrar"
  );
  subdomainRegistrar = await SubdomainRegistrar.deploy(
    ens.address,
    baseRegistrar.address
  );

  parsedFile.SUBDOMAIN_REGISTRAR_ADDRESS = subdomainRegistrar.address;
  console.log("subdomainRegistrar address:" + subdomainRegistrar.address);

  for (i = 0; i < domainNameHashes.length; i++) {
    var domainName = domainNames[i];
    var domainLabel = domainLabels[i];
    var domainNameHash = domainNameHashes[i];
    var domainResolverHash = domainResolverHashes[i];
    tx = await root.setSubnodeOwner(domainLabel, deployer.address);

    console.log(
      domainName + ":" + `setSubnodeOwner on root contract (tx: ${tx.hash})...`
    );
    await tx.wait();
  }

  const DummyOracle = await hre.ethers.getContractFactory("DummyOracle");
  const dummyOracle = await DummyOracle.deploy(
    ethers.BigNumber.from("50000000000000000")
  ); // 0.05 ether
  await dummyOracle.deployed();
  parsedFile.DUMMY_ORACLE_ADDRESS = dummyOracle.address;
  console.log("dummyOracle address:" + dummyOracle.address);

  //部署价格语言机
  const duration = calculateDuration(1);
  const LinearPremiumPriceOracle = await hre.ethers.getContractFactory(
    "LinearPremiumPriceOracle"
  );
  priceOracle = await LinearPremiumPriceOracle.deploy(
    dummyOracle.address,
    0, //PaymentTypes.PaymentInEth,
    [hundredETH, tenETH, oneETH, tenthETH, 0], //Register price
    [
      oneETH.div(duration), //Rent price:1 char,1ETH
      halfETH.div(duration), //Rent price:2 char,0.5ETH
      tenthETH.div(duration), //Rent price:3 char,0.1ETH
      percentETH.div(duration), //Rent price:4 char,0.01ETH
      millesimalETH.div(duration), //Rent price:>=5 char,0.001ETH
    ],
    premium,
    decreaseRate
  );
  await priceOracle.deployed();
  parsedFile.PRICE_ORACLE_ADDRESS = priceOracle.address;
  console.log("LinearPremiumPriceOracle address:" + priceOracle.address);

  //部署控制器
  const ETHRegistrarController = await hre.ethers.getContractFactory(
    "ETHRegistrarController"
  );
  const controller = await ETHRegistrarController.deploy(
    baseRegistrar.address,
    priceOracle.address,
    60, // 1 mins in seconds
    86400 // 24 hours in seconds
  );
  await controller.deployed();
  parsedFile.CONTROLLER_ADDRESS = controller.address;
  console.log("ETHRegistrarController address:" + controller.address);

  tx = await baseRegistrar.addController(controller.address);
  console.log(`addController on baseRegistrar contract (tx: ${tx.hash})...`);
  await tx.wait();

  tx = await controller.setPriceOracle(priceOracle.address);
  console.log(`setPriceOracle on controller contract (tx: ${tx.hash})...`);
  await tx.wait();

  //部署反向解析器
  const ReverseRegistrar = await hre.ethers.getContractFactory(
    "ReverseRegistrar"
  );
  reverseRegistrar = await ReverseRegistrar.deploy(ens.address);
  await reverseRegistrar.deployed();

  reverseRegistrarNode = getReverseNode(reverseRegistrar.address);

  parsedFile.REVERSE_REGISTRAR_ADDRESS = reverseRegistrar.address;
  console.log("reverseRegistrar address:" + reverseRegistrar.address);

  //set reverse
  tx = await root.setSubnodeOwner(sha3("reverse"), deployer.address);
  console.log(
    `set SubnodeOwner('reverse'...)  on root contract (tx: ${tx.hash})...`
  );
  await tx.wait();

  tx = await ens.setSubnodeOwner(
    namehash.hash("reverse"),
    sha3("addr"),
    reverseRegistrar.address
  );
  console.log(
    `set SubnodeOwner('reverse'...) on ens contract (tx: ${tx.hash})...`
  );
  await tx.wait();

  //NameWrapper Contract
  const NameWrapper = await hre.ethers.getContractFactory("DummyNameWrapper");
  const nameWrapper = await NameWrapper.deploy();
  await nameWrapper.deployed();
  parsedFile.NAME_WRAPPER_ADDRESS = nameWrapper.address;
  console.log("nameWrapper address:" + nameWrapper.address);

  ////PublicResolver Contract
  const PublicResolver = await hre.ethers.getContractFactory("PublicResolver");
  const resolver = await await PublicResolver.deploy(
    ens.address,
    nameWrapper.address,
    controller.address,
    reverseRegistrar.address
  );
  await resolver.deployed();
  parsedFile.RESOLVER_ADDRESS = resolver.address;
  console.log("resolver address:" + resolver.address);

  //设置根节点解析器
  tx = await root.setResolver(resolver.address);
  console.log(`setResolver on root contract (tx: ${tx.hash})...`);
  await tx.wait();

  tx = await reverseRegistrar.setDefaultResolver(resolver.address);
  await tx.wait();

  for (i = 0; i < domainNameHashes.length; i++) {
    var domainName = domainNames[i];
    var domainLabel = domainLabels[i];
    var domainNameHash = domainNameHashes[i];
    var domainResolverHash = domainResolverHashes[i];

    tx = await resolver.setInterface(
      domainNameHash,
      permanentRegistrarInterfaceId,
      controller.address
    );
    console.log(
      domainName + ":" + `setInterface on resolver contract (tx: ${tx.hash})...`
    );
    await tx.wait();
  }

  for (i = 0; i < domainNameHashes.length; i++) {
    var domainName = domainNames[i];
    var domainLabel = domainLabels[i];
    var domainNameHash = domainNameHashes[i];
    var domainResolverHash = domainResolverHashes[i];

    //set resolver
    tx = await ens.setSubnodeOwner(
      domainNameHash,
      sha3("resolver"),
      deployer.address
    );
    console.log(
      domainName + ":" + `setSubnodeOwner on ens contract (tx: ${tx.hash})...`
    );
    await tx.wait();

    tx = await ens.setResolver(domainResolverHash, resolver.address);
    console.log(
      domainName + ":" + `setResolver on ens contract (tx: ${tx.hash})...`
    );
    await tx.wait();

    tx = await resolver.setAddr(domainResolverHash, resolver.address);
    console.log(
      domainName + ":" + `setAddr on resolver contract (tx: ${tx.hash})...`
    );
    await tx.wait();
  }

  for (i = 0; i < domainNameHashes.length; i++) {
    var domainName = domainNames[i];
    var domainLabel = domainLabels[i];
    var domainNameHash = domainNameHashes[i];
    var domainResolverHash = domainResolverHashes[i];

    tx = await ens.setResolver(domainNameHash, resolver.address);
    console.log(
      domainName + ":" + `setResolver on ens contract (tx: ${tx.hash})...`
    );
    await tx.wait();

    tx = await root.setSubnodeOwner(domainLabel, baseRegistrar.address);
    console.log(
      domainName + ":" + `setSubnodeOwner on root contract (tx: ${tx.hash})...`
    );
    await tx.wait();
  }

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
