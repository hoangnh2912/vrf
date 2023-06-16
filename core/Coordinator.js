const VRF = require('./A_vrf');
const { proofVRF } = require('./A_vrf');
const { uint256 } = require('../utils/secp256k1.js');
const { ethers } = require('hardhat');
const VRFCoordinatorFactoryJSON = require('../artifacts/contracts/VRFCoordinator.sol/VRFCoordinator.json');

let abi = VRFCoordinatorFactoryJSON.abi;
let pointer = 11175561;
let step = 10;

let vrfCoordinator = '0xFE5725db462CC0a4ACa15FD9317298b1a52582b5';


function parseLog(abi,logs){
    const instant = new ethers.utils.Interface(abi);
    let result =[];
    logs.forEach(log => {
        let data = log.data;
        let topics = log.topics;
        data = (data != '0x')? data: "0x0000000000000000000000000000000000000000000000000000000000000000";
        result.push(instant.parseLog({data,topics}).args.toString()); 
    });
    return result;
}

function preVRF(eventParam){
    
}
async function main(){
    const [deployer, AOracle, BOracle, consumer] = await ethers.getSigners();
    const VRFCoordinator = await ethers.getContractAt("VRFCoordinator",vrfCoordinator);
    let eventSignature = await ethers.utils.id('RandomRequested(address,uint256,uint256)');
    // let eventSignature = ethers.utils.id('Transfer(address,address,uint256)');
    let filter = {};
    filter.address = vrfCoordinator;
    filter.topics = Array(eventSignature);
    let currentBlockNumber = await ethers.provider.getBlockNumber();

    if(pointer >= currentBlockNumber){
        console.log('Overflow:  current: ',currentBlockNumber,' filter.toBlock:',pointer);
    }
    else{
        filter.toBlock = pointer;
        filter.fromBlock = filter.toBlock+1;
        filter.toBlock = (filter.toBlock+step < currentBlockNumber)?(filter.toBlock+step):currentBlockNumber;
        pointer = filter.toBlock;
        let logs = await ethers.provider.getLogs(filter);

        if(logs.length != 0){
            console.log('---Querry from ',logs[0].blockNumber,' to ',logs[logs.length-1].blockNumber);
            let res = parseLog(abi,logs);
            // console.log(res);
            res.forEach(element => {
                element = element.split(',')
                let sender = element[0];
                let requestId = element[1];
                let preSeed = element[2];
                let proof = proofVRF(uint256(preSeed,10));
                VRFCoordinator.connect(AOracle).fulfillRandomness(proof,sender);
                console.log('success full!')
                // console.log(sender);
                // console.log(requestId);
                // console.log(preSeed);
            });
        }
        else{
            console.log('logs is null');
        }
    }
    
}
// getPointer();
// main();
setInterval(main,5000);
