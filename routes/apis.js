const crypto = require("crypto")

var express = require('express');
var router = express.Router();

const multer = require('multer');
const path = require('path');
const callRemote = require("../public/javascripts/thirdCall");
const fs = require("fs");
const {addWork} = require("../public/javascripts/worker");
const {runAsyncTask} = require("../public/javascripts/worker");
const {genSpeech2TxtArgs} = require("../public/javascripts/worker");
const {fetchFile} = require("../public/javascripts/worker");
const {getTaskByTaskId} = require("../public/javascripts/task");
const {getTasks} = require("../public/javascripts/task");
const {insertTask} = require("../public/javascripts/task");

// 设置文件上传中间件
const dest_path = 'public/uploads/'
const storage = multer.diskStorage({
//指定文件上传到服务器的路径
  destination: function (req, file, cb) {
    cb(null, dest_path)
  },
//指定上传到服务器文件的名称
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})
const upload = multer({
  // 设置上传文件存放的目录
  storage: storage,
  // 限制上传的文件大小
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1G
  },
});
// 对于文件上传路由，使用upload.single()中间件来处理单个文件上传
router.post('/asr/file', upload.single('file'), async (req, res) => {
  console.log('body:', req.body);
  console.log('接收到文件：', req.file);
  console.log('paras:', req.body.paras);
  const filename = path.resolve(__dirname, '../'+ dest_path +req.file.filename)
  await asr(filename,req.body.paras, res);
});

router.post('/asr/async', function(req, res, next) {
  console.log('body:', req.body);
  const url = req.body.speech_url;
  const paras = req.body.paras;
  const callBackUrl = req.body.call_back_url;
  const taskId = req.body.task_id === undefined ? crypto.randomUUID(): req.body.task_id;
  console.log('url path:', url);
  const filename = getFileName(url, req.body.file_name);
  const createDate = Date()
  insertTask({url:url,paras:paras,task_id:taskId, filename:filename, status:0, callBackUrl: callBackUrl, createDate:createDate}, async function (res) {
    console.log("result:", res,"taskId:", taskId)
  })
  res.status(200).json({task_id:taskId})
});

router.get('/getTasks', function(req, res, next) {
  getTasks().then(data=>{res.status(200).json(data)}).catch(err=>{
    console.log("error:",err)
    res.status(500).json({err:'no tasks'})
  })
});
router.get('/getTaskResult', function(req, res, next) {
  console.log('task_id:', req.query.task_id);
  const task_id = req.query.task_id
  if(task_id !== undefined && task_id !== null){
    getTaskByTaskId(task_id).then(r => {
      if(r.status !== 2){
        const data = {url:r.url, task_id:r.task_id, paras: r.paras, text: "not finished"}
        res.status(501).json(data)
      }else{
        const resultFilename = r.filename + ".wav.txt"
        const text = fs.readFileSync(resultFilename);
        const data = {url:r.url, task_id:r.task_id, paras: r.paras, text: text.toString()}
        res.status(200).json(data)
      }
    }).catch(err=>{
      console.log("error:",err)
      res.status(500).json({err:'no task found'})
    })
  }else{
    res.status(500).json({err:'no task id provided'})
  }
});
router.get('/asr/getResultByTaskId', function(req, res, next) {
  console.log('task_id:', req.query.task_id);
  const task_id = req.query.task_id
  if(task_id !== undefined && task_id !== null){
    getTaskByTaskId(task_id).then(r => {res.status(200).json(r)}).catch(err=>{
      console.log("error:",err)
      res.status(500).json({err:'no task found'})
    })
  }else{
    res.status(500).json({err:'no task id provided'})
  }
});
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/asr', async (req, res, next) => {
  console.log('body:', req.body);
  console.log('query:', req.query);
  console.log('params:', req.params);
  const url = req.body.speech_url;
  console.log('url path:', url);
  console.log('head:', req.headers);
  const fName = req.body.file_name

  const filename = getFileName(url, fName);
  try{
    fetchFile(url, filename).then(r => {
      console.log("done!")
      asr(filename,req.body.paras, res)
    })
  }catch (e) {
    res.status(500).json({error:'Internal error'})
  }
});
function getFileName(url, filename) {
  if(filename !== undefined){
    return path.resolve(__dirname, '../'+ dest_path + file_name);
  }else{
    const name = path.basename(url)
    console.log("name:", name)
    if(name !== undefined){
      return path.resolve(__dirname, '../'+ dest_path + Date.now()+"-"+ name)
    }
  }
  return Date.now();
}
async function asr(filename, params, res){
  const destFile = filename + '.wav' ;
  console.log('path:', filename, ", dest: ", destFile)
  const error = await runAsyncTask("ffmpeg", ["-y", "-i", filename, "-ar",16000, "-ac", 1, "-c:a", "pcm_s16le", destFile])

  if(error !== 0){
    console.log("convert to wav fail")
    res.status(500).json({ error: "convert to wav fail" });
    return;
  }
  console.log("now, speech to txt")
  const args = genSpeech2TxtArgs(params, destFile)
  const resultFilename = destFile + '.txt'
  runAsyncTask('./speech2txt', args, (resolve, err)=>{
    if(err ===0){
      const data = fs.readFileSync(resultFilename);
      console.log("同步读取: " , resultFilename, "\t content:", data.toString());
      resolve(data.toString())
    }else {
      resolve(500)
    }
  }).then(data=>{
    console.log("res:", data)
    if(data === 500 ){
      res.status(500);
    }else{
      res.status(200).json({ text: data });
    }
  })
}
module.exports = router;
