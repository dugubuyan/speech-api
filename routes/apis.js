var express = require('express');
var router = express.Router();

const multer = require('multer');
const path = require('path');
const child_process = require('child_process');
const fs = require("fs");
const fetch = require('node-fetch');

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
router.post('/upload', upload.single('file'), async (req, res) => {
  console.log('body:', req.body);
  console.log('接收到文件：', req.file);
  const filename = path.resolve(__dirname, '../'+ dest_path +req.file.filename)
  await asr(filename, res);
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

  function getFileName() {
    if(req.body.file_name !== undefined){
      return path.resolve(__dirname, '../'+ dest_path + Date.now()+"-" + req.body.file_name);
    }else{
      const name = path.basename(url)
      console.log("name:", name)
      if(name !== undefined){
        return path.resolve(__dirname, '../'+ dest_path + Date.now()+"-"+ name)
      }
    }
    return Date.now();
  }
  const filename = getFileName();
  fetchFile(url, filename).then(r => {
    console.log("done!")
    asr(filename, res)
  })
});

function runAsyncTask(exec, args, callback) {
  return new Promise((resolve, reject) => {
    const child = child_process.spawn(exec, args);
    let data = '';
    child.stdout.on('data', chunk => {
      data += chunk;
      console.log('stdout: ' + data);
    });

    child.stderr.on('data', data => {
      console.log('stderr: ' + data);
    });

    child.on('close', err => {
      console.log('子进程已退出，退出码 '+err);
      callback(resolve, err)
    });
  });
}
async function fetchFile(url, filename){
  const response = await fetch(url);
  const buffer = await response.buffer();
  fs.writeFileSync(filename, buffer)
}
async function asr(filename, res){
  const destFile = filename + '.wav' ;
  console.log('path:', filename, ", dest: ", destFile)
  let error = 0
  await runAsyncTask("ffmpeg", ["-y", "-i", filename, "-ar",16000, "-ac", 1, "-c:a", "pcm_s16le", destFile], (resolve, err) => {
    error = err
    console.log("convert done")
    resolve(0)
  })

  if(error !== 0){
    console.log("convert to wav fail")
    res.status(500).json({ error: "convert to wav fail" });
    return;
  }
  console.log("now, speech to txt")
  runAsyncTask('./speech2txt', ['-otxt',destFile], (resolve, err)=>{
    if(err ===0){
      const resultFilename = destFile + '.txt'
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
