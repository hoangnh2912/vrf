
# QUERY DATA SERVICES

## Introduction
- To listen or query event logs in blockchain.
## Features
- Listen to event logs according to event signature
- Get event logs by event signature
- Listen to all event logs that emit from address
- Get all event logs that are emitted from address
- Get event signature from abi contract and event name

## Usage

You can simply use this module like this:

```js
    const QueryDS = require('../query-data-services');
    const queryDS = queryDS.init();
    const abi = require('./GetEventABI.json');
    const functionHandleLog = (log) =>{
        console.log(log);
    }
    const addressEmitLog = '0xF47B2A0135876191Dd6637Bd588bf352C915C091';
```

To get event signature from abi and event name:
```js
    let seventSignature = queryDS.getEventTopic(abi,'Transfer');
```
To listen event logs from event name
```js
    queryDS.onEvent(eventSignature,functionHandleLog);
    queryDS.onEvent(eventSignature,functionHandleLog,addressEmitLog);
```
To listen all event logs from addressEmitLog 
```js
    queryDS.onAddress(addressEmitLog,functionHandleLog);
```
To get event logs by event signature
```js
    let logs = queryDS.getEventLogs(eventSignature);
    let logs = queryDS.getEventLogs(eventSignature,fromBlock,toBlock);
    let logs = queryDS.getEventLogs(eventSignature,fromBlock,toBlock,addressEmitLog);
```
To get all event logs from addressEmitLog 
```js
    let logs = queryDS.getAddressLogs(addressEmitLog);
    let logs = queryDS.getAddressLogs(addressEmitLog,fromBlock,toBlock);
```
To parse logs fit with abi
```js
    let result = queryDS.parse(abi,logs);
```
## Test

## Performance

## Documentation