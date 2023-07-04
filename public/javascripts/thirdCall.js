const fetch =  require('node-fetch')
// const url = "https://ip-172-31-80-140.tailnet-d842.ts.net/aitask/audiocallback"
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
async function postSpecific(url, data){
    const response = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    const res = await response.json();
    console.log("result:", res);
}
function callRemote(url, taskId, data){
    const body = {result:data, task_id:taskId}
    return postSpecific(url, body).catch(error => console.log('error', error));
}
module.exports = callRemote
// callRemote(url, {result:"aa",task_id:2}).catch(error => console.log('error', error));
