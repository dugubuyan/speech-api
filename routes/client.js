const path = require('path');
const child_process = require('child_process');
const filename = path.resolve(__dirname, '../'+ 'public/uploads/1683789850748-RGB0.wav')
console.log('path:', filename)

const workerProcess = child_process.spawn('./speech2txt', [filename]);

workerProcess.stdout.on('data', function (data) {
    console.log('stdout: ' + data);
});

workerProcess.stderr.on('data', function (data) {
    console.log('stderr: ' + data);
});

workerProcess.on('close', function (code) {
    console.log('子进程已退出，退出码 '+code);
});