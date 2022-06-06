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

const thousandETH = ethers.BigNumber.from(ethers.utils.parseEther("1000.0")); // 1000 ETH
const hundredETH = ethers.BigNumber.from(ethers.utils.parseEther("100.0")); // 100 ETH
const tenETH = ethers.BigNumber.from(ethers.utils.parseEther("10.0")); // 10 ETH
const oneETH = ethers.BigNumber.from(ethers.utils.parseEther("1.0")); // 1 ETH
const tenthETH = ethers.BigNumber.from(ethers.utils.parseEther("0.1")); // 0.1 ETH
const percentETH = ethers.BigNumber.from(ethers.utils.parseEther("0.01")); // 0.01 ETH
const millesimalETH = ethers.BigNumber.from(ethers.utils.parseEther("0.001")); // 0.001 ETH

const premium = tenETH;
const decreaseDuration = ethers.BigNumber.from(28 * DAYS);
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

const yearInSeconds = 31556952;

function calculateDuration(years) {
  return parseInt(parseFloat(years) * yearInSeconds);
}

function getReverseNode(addr) {
  return namehash.hash(addr.slice(2).toLowerCase() + ".addr.reverse");
}

let ens;
let root;
let nameWrapper;
let resolver;
let baseRegistrar;
let dummyOracle;
let priceOracle;
let controller;
let reverseRegistrar;
let deployer;
let ownerAccount;
let registrantAccount;
let staticMetadataService;
let subdomainRegistrar;

const secret =
  "0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF";

describe("NameWrapper", function () {
  before(async () => {
    //Get Deployer Info
    [deployer, registranter] = await hre.ethers.getSigners();
    ownerAccount = deployer.address; // Account that owns the registrar
    registrantAccount = registranter.address; // Account that owns test names

    //ENS Contract
    const Ens = await hre.ethers.getContractFactory("ENSRegistry");
    ens = await Ens.deploy();
    await ens.deployed();

    //Root Contract
    const Root = await hre.ethers.getContractFactory("Root");
    root = await Root.deploy(ens.address);
    await root.deployed();

    await root.setController(deployer.address, true);

    await ens.setOwner(ZERO_HASH, root.address);

    //StaticMetadataService Contract
    const StaticMetadataService = await hre.ethers.getContractFactory(
      "StaticMetadataService"
    );
    const metadataHost = network.name;
    const metadataUrl = `https://${metadataHost}/name/0x{id}`;
    const metadataArguments = [metadataUrl];
    staticMetadataService = await StaticMetadataService.deploy(
      ...metadataArguments
    );
    await staticMetadataService.deployed();

    //baseRegistrar
    const BaseRegistrar = await hre.ethers.getContractFactory(
      "BaseRegistrarImplementation"
    );
    baseRegistrar = await BaseRegistrar.deploy(ens.address, domainNameHashes);
    await baseRegistrar.deployed();
    await baseRegistrar.setBaseURI("https://metadata.unit.domains/rinkeby/");

    //subdomain
    const SubdomainRegistrar = await hre.ethers.getContractFactory(
      "SubdomainRegistrar"
    );
    subdomainRegistrar = await SubdomainRegistrar.deploy(
      ens.address,
      baseRegistrar.address
    );

    for (i = 0; i < domainNameHashes.length; i++) {
      var domainName = domainNames[i];
      var domainLabel = domainLabels[i];
      var domainNameHash = domainNameHashes[i];
      var domainResolverHash = domainResolverHashes[i];
      await root.setSubnodeOwner(domainLabel, deployer.address);
    }

    const DummyOracle = await hre.ethers.getContractFactory("DummyOracle");
    dummyOracle = await DummyOracle.deploy(
      ethers.BigNumber.from("50000000000000000")
    ); // 0.05 ether
    await dummyOracle.deployed();

    const LinearPremiumPriceOracle = await hre.ethers.getContractFactory(
      "LinearPremiumPriceOracle"
    );
    const duration = calculateDuration(1);
    priceOracle = await LinearPremiumPriceOracle.deploy(
      dummyOracle.address,
      0, //PaymentTypes.PaymentInEth,
      [thousandETH, hundredETH, oneETH, 0], //Register price
      [
        oneETH.div(duration),
        oneETH.div(duration),
        tenthETH.div(duration),
        percentETH.div(duration),
        millesimalETH.div(duration),
      ],
      premium,
      decreaseRate
    ); //Rent price
    await priceOracle.deployed();

    const ETHRegistrarController = await hre.ethers.getContractFactory(
      "ETHRegistrarController"
    );
    controller = await ETHRegistrarController.deploy(
      baseRegistrar.address,
      priceOracle.address,
      0, // 10 mins in seconds
      86400 // 24 hours in seconds
    );
    await controller.deployed();

    await baseRegistrar.addController(controller.address);

    await controller.setPriceOracle(priceOracle.address);

    //部署反向解析器
    const ReverseRegistrar = await hre.ethers.getContractFactory(
      "ReverseRegistrar"
    );
    reverseRegistrar = await ReverseRegistrar.deploy(ens.address);
    await reverseRegistrar.deployed();

    reverseRegistrarNode = getReverseNode(reverseRegistrar.address);

    //设置reverse
    tx = await root.setSubnodeOwner(sha3("reverse"), deployer.address);

    await ens.setSubnodeOwner(
      namehash.hash("reverse"),
      sha3("addr"),
      reverseRegistrar.address
    );

    //部署公共解析器
    /*
                const wrapperArguments = [ens.address, baseRegistrar.address, staticMetadataService.address]
                const NameWrapper = await hre.ethers.getContractFactory("NameWrapper");
                nameWrapper = await NameWrapper.deploy(...wrapperArguments);
                await nameWrapper.deployed();
        */
    const NameWrapper = await hre.ethers.getContractFactory("DummyNameWrapper");
    nameWrapper = await NameWrapper.deploy();
    await nameWrapper.deployed();

    const PublicResolver = await hre.ethers.getContractFactory(
      "PublicResolver"
    );
    resolver = await PublicResolver.deploy(
      ens.address,
      nameWrapper.address,
      controller.address,
      reverseRegistrar.address
    );
    await resolver.deployed();

    await root.setResolver(resolver.address);
    await reverseRegistrar.setDefaultResolver(resolver.address);

    for (i = 0; i < domainNameHashes.length; i++) {
      var domainName = domainNames[i];
      var domainLabel = domainLabels[i];
      var domainNameHash = domainNameHashes[i];
      var domainResolverHash = domainResolverHashes[i];

      await resolver.setInterface(
        domainNameHash,
        permanentRegistrarInterfaceId,
        controller.address
      );
    }

    for (i = 0; i < domainNameHashes.length; i++) {
      var domainName = domainNames[i];
      var domainLabel = domainLabels[i];
      var domainNameHash = domainNameHashes[i];
      var domainResolverHash = domainResolverHashes[i];

      //布置resolver.eth
      await ens.setSubnodeOwner(
        domainNameHash,
        sha3("resolver"),
        deployer.address
      );
      await ens.setResolver(domainResolverHash, resolver.address);
      await resolver.setAddr(domainResolverHash, resolver.address);
    }

    for (i = 0; i < domainNameHashes.length; i++) {
      var domainName = domainNames[i];
      var domainLabel = domainLabels[i];
      var domainNameHash = domainNameHashes[i];
      var domainResolverHash = domainResolverHashes[i];

      ens.setResolver(domainNameHash, resolver.address);

      await root.setSubnodeOwner(domainLabel, baseRegistrar.address);
    }
  });

  const checkLabels = {
    testing: true,
    longname12345678: true,
    sixsix: true,
    five5: true,
    four: true,
    iii: true,
    ii: true,
    i: true,
    "": false,

    // { ni } { hao } { ma } (chinese; simplified)
    "\u4f60\u597d\u5417": true,

    // { ta } { ko } (japanese; hiragana)
    "\u305f\u3053": true,

    // { poop } { poop } { poop } (emoji)
    "\ud83d\udca9\ud83d\udca9\ud83d\udca9": true,

    // { poop } { poop } (emoji)
    "\ud83d\udca9\ud83d\udca9": true,
  };

  it("Should report label validity", async function () {
    for (const label in checkLabels) {
      expect(await controller.valid(label)).to.equal(checkLabels[label]);
    }
    /*   const Greeter = await ethers.getContractFactory("Greeter");
           const greeter = await Greeter.deploy("Hello, world!");
           await greeter.deployed();

           expect(await greeter.greet()).to.equal("Hello, world!");

           const setGreetingTx = await greeter.setGreeting("Hola, mundo!");

           // wait until the transaction is mined
           await setGreetingTx.wait();

           expect(await greeter.greet()).to.equal("Hola, mundo!");*/

    console.log(await baseRegistrar.baseNodes(0));
    console.log(await baseRegistrar.getBaseNodesLength());
  });

  it("Should report baseRegistrar baseNodes info", async function () {
    console.log(await baseRegistrar.baseNodes(0));
    console.log(await baseRegistrar.getBaseNodesLength());
  });

  it("should report unused names as available", async () => {
    expect(await controller.available(sha3("abc"), 0)).to.equal(true);
    expect(await controller.available(sha3("abc"), 1)).to.equal(true);
  });

  it("should report rentPrice", async () => {
    const duration = calculateDuration(1);
    var rent = await controller.rentPrice("abc", duration, 0);
    expect(new EthVal(rent).toEth().toFixed(4).toString()).to.equal("0.1000");

    var register = await controller.registerPrice("abc", duration, 0);
    expect(new EthVal(register).toEth().toFixed(4).toString()).to.equal(
      "1.0000"
    );
  });

  it("should permit new registrations with register", async () => {
    var commitment = await controller.makeCommitment(
      "abcde",
      ownerAccount,
      secret,
      0
    );

    var tx = await controller.commit(commitment);
    //expect(await controller.commitments(commitment)).to.equal(
    //    (await web3.eth.getBlock(tx.receipt.blockNumber)).timestamp);

    //await evm.advanceTime((await controller.minCommitmentAge()).toNumber());
    //   var balanceBefore = await web3.eth.getBalance(controller.address);
    var tx = await controller.register(
      "abcde",
      ownerAccount,
      28 * DAYS,
      secret,
      0,
      {
        value: 100000000000000,
      }
    );

    expect(await ens.owner(namehash.hash("abcde." + domainNames[0]))).to.equal(
      ownerAccount
    );
  });

  it("should permit new registrations with registerWithConfig", async () => {
    var commitment = await controller.makeCommitmentWithConfig(
      "abcdefg",
      ownerAccount,
      secret,
      resolver.address,
      ownerAccount,
      0
    );
    var tx = await controller.commit(commitment);
    //expect(await controller.commitments(commitment)).to.equal(
    //    (await web3.eth.getBlock(tx.receipt.blockNumber)).timestamp);

    //await evm.advanceTime((await controller.minCommitmentAge()).toNumber());
    //   var balanceBefore = await web3.eth.getBalance(controller.address);
    var tx = await controller.registerWithConfig(
      "abcdefg",
      ownerAccount,
      28 * DAYS,
      secret,
      resolver.address,
      ownerAccount,
      0,
      {
        value: 100000000000000,
      }
    );

    //    console.log("ownerAccount:" + ownerAccount)
    //    console.log("resolver:" + resolver.address)
    //    console.log("controller:" + controller.address)
    //    console.log("owner:" + await ens.owner(namehash.hash('abcdefg.cat')))

    //   expect(await ens.owner(namehash.hash('abcdefg.cat'))).to.equal(ownerAccount);
  });

  it("should report registered names as unavailable", async () => {
    expect(await controller.available("abcde", 0)).to.equal(false);
    expect(await controller.available("abcde", 1)).to.equal(true);
  });

  it("should report tokenURI", async () => {
    console.log(
      "baseRegistrar:" +
        (await baseRegistrar.tokenURI(namehash.hash("abcde." + domainNames[0])))
    );
  });

  it("should permit setting address by owner", async () => {
    node = namehash.hash("abcde." + domainNames[0]);
    expect(await ens.owner(namehash.hash("abcde." + domainNames[0]))).to.equal(
      ownerAccount
    );
    await resolver.setAddr(node, ownerAccount);
    console.log(await await resolver.methods["addr(bytes32)"](node));

    expect(await resolver.methods["addr(bytes32)"](node)).to.equal(
      ownerAccount
    );
  });

  it("should permit new registrations with SubdomainRegistrar ", async () => {
    await ens.setApprovalForAll(subdomainRegistrar.address, true);

    expect(
      await subdomainRegistrar.available(
        namehash.hash("abcde." + domainNames[0]),
        sha3("123")
      )
    ).to.equal(true);

    //register 123.abcde.cat
    await subdomainRegistrar.register(
      namehash.hash("abcde." + domainNames[0]),
      "123",
      resolver.address
    );

    expect(
      await subdomainRegistrar.available(
        namehash.hash("abcde." + domainNames[0]),
        sha3("123")
      )
    ).to.equal(false);

    expect(
      await subdomainRegistrar.available(
        namehash.hash("123.abcde." + domainNames[0]),
        sha3("x")
      )
    ).to.equal(true);

    //register x.123.abcde.cat
    let tx = await subdomainRegistrar.register(
      namehash.hash("123.abcde." + domainNames[0]),
      "x",
      resolver.address
    );

    let receipt = await tx.wait();
    console.log(receipt.events);

    expect(
      await subdomainRegistrar.available(
        namehash.hash("123.abcde." + domainNames[0]),
        sha3("x")
      )
    ).to.equal(false);

    expect(
      await subdomainRegistrar.available(
        namehash.hash("x.123.abcde." + domainNames[0]),
        sha3("t")
      )
    ).to.equal(true);
    await subdomainRegistrar.register(
      namehash.hash("x.123.abcde." + domainNames[0]),
      "t",
      resolver.address
    );

    expect(
      await subdomainRegistrar.available(
        namehash.hash("x.123.abcde." + domainNames[0]),
        sha3("t")
      )
    ).to.equal(false);

    //    await baseRegistrar.reclaim(namehash.hash('abcde.' + domainNames[0]), '0xF0644aB2ffd1EFFd72B9976F9e4dD7625e961411', 0)
    //   expect(await ens.owner(namehash.hash('abcde.' + domainNames[0]))).to.equal('0xF0644aB2ffd1EFFd72B9976F9e4dD7625e961411');
  });

  //  console.log(namehash.hash('abcde.about'));
  it("should report registrar reclaim", async () => {
    //    await baseRegistrar.reclaim(namehash.hash('abcde.' + domainNames[0]), '0xF0644aB2ffd1EFFd72B9976F9e4dD7625e961411', 0)
    //   expect(await ens.owner(namehash.hash('abcde.' + domainNames[0]))).to.equal('0xF0644aB2ffd1EFFd72B9976F9e4dD7625e961411');
  });

  /*it('should permit new subdomain registrations', async () => {
        var commitment = await controller.makeCommitment("abcde", ownerAccount, secret, 0);
        var tx = await controller.commit(commitment);
        //expect(await controller.commitments(commitment)).to.equal(
        //    (await web3.eth.getBlock(tx.receipt.blockNumber)).timestamp);

        //await evm.advanceTime((await controller.minCommitmentAge()).toNumber());
        //   var balanceBefore = await web3.eth.getBalance(controller.address);
        var tx = await controller.register("abcde", ownerAccount, 28 * DAYS, secret, 0, {
            value: 100000000000000
        });

        console.log(ownerAccount)

        let message = "abcde";
        let messageBytes = ethers.utils.toUtf8Bytes(message);
        let messageDigest = ethers.utils.keccak256(messageBytes);

        console.log(messageDigest)
        console.log(namehash.hash('abcde.dog'))

        console.log(await ens.owner(messageDigest))
        console.log(await ens.owner(namehash.hash('abcde.dog')))

    });

    it('should report registered subdomain names as unavailable', async () => {
        expect(await controller.available('abcde', 0)).to.equal(false);
        expect(await controller.available('abcde', 1)).to.equal(true);
    });

    */
});

describe("PublicResolver", function () {
  it("supports known interfaces", async () => {
    expect(await resolver.supportsInterface("0x3b3b57de")).to.equal(true); // IAddrResolver
    expect(await resolver.supportsInterface("0xf1cb7e06")).to.equal(true); // IAddressResolver
    expect(await resolver.supportsInterface("0x691f3431")).to.equal(true); // INameResolver
    expect(await resolver.supportsInterface("0x2203ab56")).to.equal(true); // IABIResolver
    expect(await resolver.supportsInterface("0xc8690233")).to.equal(true); // IPubkeyResolver
    expect(await resolver.supportsInterface("0x59d1d43c")).to.equal(true); // ITextResolver
    expect(await resolver.supportsInterface("0xbc1c58d1")).to.equal(true); // IContentHashResolver
    expect(await resolver.supportsInterface("0xa8fa5682")).to.equal(true); // IDNSRecordResolver
    expect(await resolver.supportsInterface("0x5c98042b")).to.equal(true); // IDNSZoneResolver
    expect(await resolver.supportsInterface("0x01ffc9a7")).to.equal(true); // IInterfaceResolver
  });

  it("does not support a random interface", async () => {
    expect(await resolver.supportsInterface("0x3b3b57df")).to.equal(false);
  });

  it("should get resolver address", async () => {
    node = namehash.hash("resolver." + domainNames[0]);
    expect(await ens.resolver(node)).to.equal(resolver.address);

    node = namehash.hash("resolver." + domainNames[1]);
    expect(await ens.resolver(node)).to.equal(resolver.address);
  });

  it("should get controller address", async () => {
    let controllerAddress = await resolver.interfaceImplementer(
      namehash.hash("unit"),
      permanentRegistrarInterfaceId
    );
    expect(controllerAddress).to.equal(controller.address);
  });

  it("should permit setting address by owner", async () => {
    node = namehash.hash("abcde." + domainNames[0]);
    expect(await ens.owner(namehash.hash("abcde." + domainNames[0]))).to.equal(
      ownerAccount
    );
    await resolver.setAddr(node, ownerAccount);
    expect(await resolver.addr(node)).to.equal(ownerAccount);
  });
});

describe("ReverseRegistrar", function () {
  it("should calculate node hash correctly", async () => {
    node = getReverseNode(ownerAccount);
    expect(await reverseRegistrar.node(ownerAccount)).to.equal(node);
  });

  it("sets name records", async () => {
    // console.log("name:" + (await resolver.name(node)));
    // console.log(resolver.address);
    // console.log(reverseRegistrar.address);
    // console.log(ens.address);

    await reverseRegistrar.claimForAddr(
      ownerAccount,
      ownerAccount,
      resolver.address
    );
    expect(await ens.owner(node)).to.equal(ownerAccount);

    await reverseRegistrar.claimWithResolver(ownerAccount, resolver.address);

    await reverseRegistrar.setName("testname");
    node = getReverseNode(ownerAccount);
    expect(await ens.resolver(node)).to.equal(resolver.address);
    expect(await resolver.name(node)).to.equal("testname");
  });
});
