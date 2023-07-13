const {updateTaskResult} = require("./task");
const {getTaskByTaskId} = require("./task");
const fetch = require('node-fetch');
const fs = require("fs");
const child_process = require('child_process');
const callRemote = require("./thirdCall");
const {getOneTaskByCondition} = require("./task");
const tasks = []
const cbMap = new Map();

setInterval(flushTasks, 2000)
setInterval(doWork, 2000)

async function doWork(){
    let taskId = tasks.pop()
    while(taskId !== undefined){
        console.log("now, process a task:", taskId)
        const data = await work(taskId)
        await workDone(taskId, data)
        console.log("now, finished task:", taskId)
        taskId = tasks.pop()
        cbMap.delete(taskId)
    }
}

function addWork(task_id, cbUrl){
    if(task_id === undefined || task_id === null){
        console.error("task id is null")
        return;
    }
    tasks.push(task_id)
    if(cbUrl!== undefined && cbUrl !== null){
        cbMap.set(task_id, cbUrl)
    }
    console.log("add task to queue :", task_id, "now the queue length is :", tasks.length)
}
async function flushTasks() {
    const task = await getOneTaskByCondition("status", 1)
    if (task === null) {
        getOneTaskByCondition("status", 0).then(newTask => {
            if (newTask !== null) {
                updateTaskResult(newTask.task_id, {status: 1}).then(() => {
                    addWork(newTask.task_id, newTask.callBackUrl)
                })
            }
        })
    } else {
        const now = new Date()
        const time = new Date(task.createDate)
        if(now.getTime() - time.getTime() > 3600 * 1000  ){
            updateTaskResult(task.task_id, {status: 3}).then(()=>{
                console.log("task out time:", task.task_id)
            })
        }else{
            console.log("still working on :", task)
        }
    }
}
function workDone(taskId, data){
    const obj = {status :2};
    if(data === -1){
        obj.status = 4 // fail
    }
    updateTaskResult(taskId, obj).then(()=>{
        if(cbMap.has(taskId)){
            const cbUrl = cbMap.get(taskId)
            callRemote(cbUrl, taskId, data).then(r => {console.log("call successful")}).catch(e=>{
                console.error(e)
            })
        }
    })
}
async function work(taskId){
    const task = await getTaskByTaskId(taskId)
    const url = task.url
    const paras = task.paras
    const filename = task.fullPath
    try {
        if(url !== undefined && url !== null){
            await fetchFile(url, filename)
            console.log("fetch remote file done!")
        }else if(task.youtubeUrl !== undefined && task.youtubeUrl !== null){
            const args = [task.youtubeUrl, "-o",'%(title)s.%(ext)s']
            await runAsyncTask("youtube-dl", args);
        }
        const data = await asrAsync(filename, paras)
        console.log("res:",data)
        return data
    } catch (e) {
        console.log("error:", e)
        return -1
    }
}
async function asrAsync(filename, params){
    const destFile = filename + '.wav' ;
    console.log('path:', filename, ", dest: ", destFile)
    await runAsyncTask("ffmpeg", ["-y", "-i", filename, "-ar",16000, "-ac", 1, "-c:a", "pcm_s16le", destFile])
    const args = genSpeech2TxtArgs(params, destFile)
    const resultFilename = destFile + '.txt'
    const res = await runAsyncTask('./speech2txt', args)
    console.log("speech2txt done:", resultFilename, "res:", res)
    const data = fs.readFileSync(resultFilename);
    return data.toString()
}
async function fetchFile(url, filename){
    const response = await fetch(url);
    const buffer = await response.buffer();
    fs.writeFileSync(filename, buffer)
}
function runAsyncTaskStdout(exec, args) {
    return new Promise((resolve, reject) => {
        const child = child_process.spawn(exec, args);
        child.stdout.on('data', data => {
            console.log('stdout: ' + data);
            resolve(data.toString().trim())
        });

        child.stderr.on('data', data => {
            console.log('stderr: ' + data);
        });

        child.on('close', err => {
            console.log('子进程已退出，退出码 '+err, "--->args:", args);
        });
    });
}

function runAsyncTask(exec, args) {
    return new Promise((resolve, reject) => {
        const child = child_process.spawn(exec, args);
        let data = '';
        child.stdout.on('data', chunk => {
            data += chunk;
            console.log('stdout: ' + data);
        });

        child.stderr.on('data', data => {
            // console.log('stderr: ' + data);
        });

        child.on('close', err => {
            console.log('子进程已退出，退出码 '+err, "--->args:", args);
            resolve(err)
        });
    });
}
function genSpeech2TxtArgs(params, destFile){
    const args = ['-olrc', '-otxt', destFile]
    if(params !== undefined && params !== null){
        console.log("params:", params)
        params.trim().split(" ").forEach(p=>{
            args.push(p)
        })
    }
    console.log(args)
    return args
}
module.exports = {fetchFile, runAsyncTask, genSpeech2TxtArgs, runAsyncTaskStdout}