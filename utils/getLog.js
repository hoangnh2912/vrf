const { ethers } = require('ethers');  
// var abi = require('./SharingData.json');

/**
 * Connect to provider moralis.
 */
var url = 'https://rinkeby.infura.io/v3/407c094ecad24b84948a2acbb76266b9';
const providers = new ethers.providers.JsonRpcProvider(url);


/**
 * @dev Function listen event rely event's signature.
 * @param {bytes32} eventSignature 
 * @param {function} functionHandleLog 
 * @param {bytes20} addressEmitLog 
 */
function onEvent(eventSignature,functionHandleLog,addressEmitLog = null){
    let filter = {
        address: addressEmitLog,
        topics: [
            eventSignature
        ]
    }
    // if (addressEmitLog == null){
    //     delete filter.address
    // }
    addressEmitLog??(delete filter.address);
    this.providers.on(filter, (log) => {
        functionHandleLog(log);
    })
}

/**
 * @dev Function listen all event be emited from address.
 * @param {bytes20} addressEmitLog 
 * @param {function} functionHandleLog 
 */
function onAddress(addressEmitLog,functionHandleLog){
    let filter = {
        address: addressEmitLog
    }
    providers.on(filter, (log) => {
        /**
         * xử lý dữ liệu nghe được trong này.
         */
        functionHandleLog(log);
    })
}


/**
 * @dev Get event topic from abi and event's name.
 * @param {jsonObject} abi 
 * @param {string} eventName 
 * @returns 
 */
function getEventTopic(abi,eventName){
    const instant = new ethers.utils.Interface(abi);
    return  instant.getEventTopic(eventName);
}

function fommat(abi){
    const instant = new ethers.utils.Interface(abi);
    return instant.format();
}
function events(abi){
    const instant = new ethers.utils.Interface(abi);
    return instant.events;
}
/**
 * @dev get event logs with block tag. 
 * @notice moralis restrict toBlock - fromBlock <=2000.
 * @param {bytes32} eventSignature 
 * @param {blockTag} fromBlock default latest -100.
 * @param {blockTag} toBlock default latest.
 * @param {bytes20} address default = null.
 * @returns Logs event satisfy filter.
 */
async function getEventLogs(eventSignature, fromBlock, toBlock, addressEmitLog){
    let filter = {
        address: addressEmitLog,
        topics: [
            eventSignature
        ]
    }
    // if (addressEmitLog == null){
    //     delete filter.address
    // }
    addressEmitLog??(delete filter.address);

    let latest = await this.providers.getBlockNumber();
    // filter.fromBlock = (fromBlock != null)? fromBlock: latest-100; 
    fromBlock ??= latest -100;
    // filter.toBlock = (toBlock != null)? toBlock: latest;
    toBlock ??= latest;

    filter.fromBlock = fromBlock;
    filter.toBlock = toBlock;
    let logs = await this.providers.getLogs(filter);
    return logs;
}

/**
 * @dev Function listen all event be emited by address.
 * @notice moralis restrict toBlock - fromBlock <=2000.
 * @param {bytes20} addressEmitLog 
 * @param {blockTag} fromBlock default latest -100.
 * @param {blockTag} toBlock default latest.
 * @returns Logs event satisfy filter.
 */
async function getAddressLogs(addressEmitLog, fromBlock, toBlock ){
    let filter = {
        address: addressEmitLog
    }
    let latest = await providers.getBlockNumber();
    // filter.fromBlock = (fromBlock != null)? fromBlock: latest-1; 
    filter.fromBlock ??= latest-100;
    // filter.toBlock = (toBlock != null)? toBlock: latest;
    filter.toBlock ??= latest;

    filter.fromBlock = fromBlock;
    filter.toBlock = toBlock;
    let logs = await this.providers.getLogs(filter);
    return logs;
}
/**
 * @dev parse array logs fit to abi event.
 * @param {jsonObject} abi 
 * @param {array} logs 
 * @return Logs parsed with abi.
 */
function parseLog(abi,logs){
    const instant = new ethers.utils.Interface(abi);
    let result =[];
    logs.forEach(log => {
        let data = log.data;
        let topics = log.topics;
        data = (data != '0x')? data: "0x0000000000000000000000000000000000000000000000000000000000000000";
        result.push(instant.parseLog({data,topics})); 
    });
    return result;
}

/**
 * Export module.
 */
module.exports = {
        onEvent: onEvent,
        onAddress: onAddress,
        getEventTopic: getEventTopic,
        getEventLogs: getEventLogs,
        getAddressLogs: getAddressLogs,
        parseLog: parseLog,
        events: events,
        fommat:fommat
}

