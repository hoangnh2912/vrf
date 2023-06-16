
import * as dotenv from "dotenv";
import { BigNumberish } from "ethers";
import { ethers } from "hardhat";
dotenv.config();

const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
let PRIVATE_KEY = process.env.DEPLOYER;
let owner = new ethers.Wallet(PRIVATE_KEY, provider);

async function balance(address:string, unit: number = 18) {
  return ethers.utils.formatUnits(await provider.getBalance(address),unit);
}
const toEther = (value: BigNumberish) => {return ethers.utils.formatEther(value)}

async function LinkDeploy() {
  console.log("======== state ========")
  console.log("block number: ", await ethers.provider.getBlockNumber());
  console.log("owner address: ", owner.address);
  console.log("owner balance: ", await balance(owner.address));

  const LinkFactory = await ethers.getContractFactory("Link",owner);
  const link = await LinkFactory.deploy();
  await link.deployed();

  const faucetAmount = ethers.utils.parseEther("100");
  const faucetAmountLink = ethers.utils.parseEther("100000");
  const FaucetFactory = await ethers.getContractFactory("Faucet",owner);
  const faucet = await FaucetFactory.deploy(link.address, {value: faucetAmount});
  await faucet.deployed();
  await link.transfer(faucet.address,faucetAmountLink);

  await faucet.loot();
  return link.address;
}
async function FaucetDeploy(linkAddr: string) {
  // attach owner to LinkFactory to ignore error getSigner
  const LinkFactory = await ethers.getContractFactory("Link",owner);
  const link = new ethers.Contract(linkAddr,LinkFactory.interface,owner);
  const faucetAmount = ethers.utils.parseEther("100");
  const faucetAmountLink = ethers.utils.parseEther("100000");
  const FaucetFactory = await ethers.getContractFactory("Faucet",owner);
  const faucet = await FaucetFactory.deploy(link.address, {value: faucetAmount});
  await faucet.deployed();
  await link.transfer(faucet.address,faucetAmountLink);

  return faucet.address;
}
async function CoordinatorDeploy(){

}

async function Deploy() {
  let linkAddr = await LinkDeploy();
  let faucetAddr = await FaucetDeploy(linkAddr);


  console.log("=============== LOG ===============");
  console.log("link address: ", linkAddr);
  console.log("faucet address: ", faucetAddr);
  console.log("=============== END ===============");
}
Deploy();