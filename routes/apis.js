var express = require('express');
var router = express.Router();

const multer = require('multer');
const path = require('path');
const child_process = require('child_process');
const fs = require("fs");
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
  console.log('path:', filename)
  runAsyncTask('./speech2txt', ['-otxt',filename]).then(data=>{
    console.log("res:", data)
    if(data === 500 ){
      res.status(500);
    }else{
      res.status(200).json({ text: data });
    }
  })
});

router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/test', function(req, res, next) {
  console.log('body:', req.body);
  console.log('head:', req.headers);
  res.send('respond with a resource');
});

function runAsyncTask(exec, args) {
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
      if(err ===0){
        const filename = args[1] + '.txt'
        const data = fs.readFileSync(filename);
        console.log("同步读取: " , filename, "\t content:", data.toString());
        resolve(data.toString())
      }else {
        resolve(500)
      }
    });
  });
}
module.exports = router;
