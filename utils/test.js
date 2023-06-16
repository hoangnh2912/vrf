const { ethers } = require('hardhat');

let eventSignature = ethers.utils.id('RandomRequested(address)');
let filter = {};
filter.topics = Array(eventSignature);
ethers.provider.on(filter,(logs)=> console.log(logs))